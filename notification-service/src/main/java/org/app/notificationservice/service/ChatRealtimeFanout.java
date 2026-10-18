package org.app.notificationservice.service;

import tools.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.app.sharedevents.entity.TicketChatMessageEvent;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

@Service @RequiredArgsConstructor
public class ChatRealtimeFanout {
    public static final String CHANNEL = "ws-support-chat";
    private final StringRedisTemplate redis;
    private final ObjectMapper mapper;

    public void publish(TicketChatMessageEvent event) {
        redis.convertAndSend(CHANNEL, mapper.writeValueAsString(event));
    }
}
