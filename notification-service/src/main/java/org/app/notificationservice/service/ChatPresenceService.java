package org.app.notificationservice.service;

import lombok.RequiredArgsConstructor;
import org.app.sharedevents.entity.TicketChatMessageEvent;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import java.time.Duration;
import java.util.Set;

@Service @RequiredArgsConstructor
public class ChatPresenceService {
    private final StringRedisTemplate redis;
    private final ChatRealtimeFanout fanout;
    private static final String ACTIVE = "chat:presence:active";
    private static final org.springframework.data.redis.core.script.RedisScript<Long> CLAIM_EXPIRED =
            new org.springframework.data.redis.core.script.DefaultRedisScript<>(
                    "local score=redis.call('ZSCORE',KEYS[1],ARGV[1]); "
                    + "if score and tonumber(score)<=tonumber(ARGV[2]) then return redis.call('ZREM',KEYS[1],ARGV[1]) end; return 0", Long.class);
    private String sessions(String key) { return "chat:presence:sessions:" + key; }
    public boolean online(String key) {
        Long count = redis.opsForZSet().count(sessions(key), System.currentTimeMillis(), Double.POSITIVE_INFINITY);
        return count != null && count > 0;
    }
    public void heartbeat(String key, String session, boolean leave) {
        boolean wasOnline = online(key);
        long now = System.currentTimeMillis();
        redis.opsForZSet().removeRangeByScore(sessions(key), Double.NEGATIVE_INFINITY, now);
        if (leave) redis.opsForZSet().remove(sessions(key), session);
        else {
            redis.opsForZSet().add(sessions(key), session, now + 90000);
            redis.expire(sessions(key), Duration.ofSeconds(120));
            redis.opsForZSet().add(ACTIVE, key, now + 90000);
        }
        if (wasOnline != online(key)) notifyWatchers(key);
    }
    public void watch(String key, Long ticketId) {
        if (key == null || key.isEmpty()) return;
        redis.opsForZSet().add("chat:presence:watch:" + key, ticketId.toString(), System.currentTimeMillis() + 120000);
        redis.expire("chat:presence:watch:" + key, Duration.ofSeconds(150));
    }
    private void notifyWatchers(String key) {
        String watchKey = "chat:presence:watch:" + key;
        long now = System.currentTimeMillis();
        redis.opsForZSet().removeRangeByScore(watchKey, Double.NEGATIVE_INFINITY, now);
        Set<String> ids = redis.opsForZSet().rangeByScore(watchKey, now, Double.POSITIVE_INFINITY);
        if (ids != null) for (String id : ids) fanout.publish(TicketChatMessageEvent.builder()
                .eventType("PRESENCE").ticketId(Long.valueOf(id)).build());
    }
    @Scheduled(fixedDelay = 10000)
    public void expireSessions() {
        long cutoff = System.currentTimeMillis();
        Set<String> keys = redis.opsForZSet().rangeByScore(ACTIVE, Double.NEGATIVE_INFINITY, cutoff, 0, 500);
        if (keys != null) for (String key : keys) {
            // Do not remove a heartbeat renewed by another node after the scan.
            Long claimed = redis.execute(CLAIM_EXPIRED, java.util.List.of(ACTIVE), key, String.valueOf(cutoff));
            if (Long.valueOf(1).equals(claimed) && !online(key)) notifyWatchers(key);
        }
    }
}
