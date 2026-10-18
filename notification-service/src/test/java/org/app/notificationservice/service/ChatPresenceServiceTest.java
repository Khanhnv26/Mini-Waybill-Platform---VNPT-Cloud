package org.app.notificationservice.service;

import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.*;
import java.util.Set;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;

class ChatPresenceServiceTest {
    final StringRedisTemplate redis = mock(StringRedisTemplate.class);
    @SuppressWarnings("unchecked") final ZSetOperations<String, String> sets = mock(ZSetOperations.class);
    final ChatRealtimeFanout fanout = mock(ChatRealtimeFanout.class);
    final ChatPresenceService service = new ChatPresenceService(redis, fanout);

    ChatPresenceServiceTest() { when(redis.opsForZSet()).thenReturn(sets); }

    @Test void closingOneOfMultipleSessionsKeepsTheUserOnline() {
        when(sets.count(eq("chat:presence:sessions:user:7"), anyDouble(), anyDouble())).thenReturn(2L, 1L);
        service.heartbeat("user:7", "session_a", true);
        verify(sets).remove("chat:presence:sessions:user:7", "session_a");
        verifyNoInteractions(fanout);
    }
    @Test void closingTheLastSessionNotifiesOnlyTicketsWatchingThatIdentity() {
        when(sets.count(eq("chat:presence:sessions:user:7"), anyDouble(), anyDouble())).thenReturn(1L, 0L);
        when(sets.rangeByScore(eq("chat:presence:watch:user:7"), anyDouble(), anyDouble())).thenReturn(Set.of("12"));
        service.heartbeat("user:7", "session_a", true);
        verify(fanout).publish(argThat(event -> event.getTicketId() == 12L && "PRESENCE".equals(event.getEventType())));
    }
    @Test void expiredSessionsBecomeOfflineAndNotifyWatchersWithoutAClientDisconnect() {
        when(redis.execute(any(org.springframework.data.redis.core.script.RedisScript.class), anyList(), any(), any())).thenReturn(1L);
        when(sets.rangeByScore(eq("chat:presence:active"), anyDouble(), anyDouble(), eq(0L), eq(500L))).thenReturn(Set.of("guest:12"));
        when(sets.count(eq("chat:presence:sessions:guest:12"), anyDouble(), anyDouble())).thenReturn(0L);
        when(sets.rangeByScore(eq("chat:presence:watch:guest:12"), anyDouble(), anyDouble())).thenReturn(Set.of("12"));
        service.expireSessions();
        assertFalse(service.online("guest:12"));
        verify(fanout).publish(argThat(event -> event.getTicketId() == 12L));
    }

    @Test void aHeartbeatRenewedAfterTheExpiryScanIsNotRemovedOrBroadcastOffline() {
        when(sets.rangeByScore(eq("chat:presence:active"), anyDouble(), anyDouble(), eq(0L), eq(500L))).thenReturn(Set.of("user:7"));
        when(redis.execute(any(org.springframework.data.redis.core.script.RedisScript.class), anyList(), any(), any())).thenReturn(0L);
        service.expireSessions();
        verifyNoInteractions(fanout);
    }
}
