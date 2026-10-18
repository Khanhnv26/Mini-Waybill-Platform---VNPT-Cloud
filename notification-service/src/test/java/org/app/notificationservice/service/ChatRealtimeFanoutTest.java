package org.app.notificationservice.service;

import org.app.notificationservice.config.RedisPubSubConfig;
import org.app.sharedevents.entity.TicketChatMessageEvent;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.redis.connection.Message;
import org.springframework.data.redis.connection.MessageListener;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.listener.ChannelTopic;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import tools.jackson.databind.json.JsonMapper;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import static org.junit.jupiter.api.Assertions.*;

class ChatRealtimeFanoutTest {
    @Test void everyWebSocketNodeReceivesPrivateMessagesAndReadReceiptsFromRedis() {
        var mapper = JsonMapper.builder().build();
        var redis = mock(StringRedisTemplate.class);
        var fanout = new ChatRealtimeFanout(redis, mapper);
        var event = TicketChatMessageEvent.builder().eventType("MESSAGE").ticketId(7L).ticketCode("TKT-7")
                .messageId(101L).audienceKey("user:12").content("hello").createdAt(LocalDateTime.now()).build();
        fanout.publish(event);
        var json = ArgumentCaptor.forClass(String.class);
        verify(redis).convertAndSend(eq(ChatRealtimeFanout.CHANNEL), json.capture());
        for (int node = 0; node < 2; node++) {
            var container = mock(RedisMessageListenerContainer.class);
            var messaging = mock(SimpMessagingTemplate.class);
            new RedisPubSubConfig().registerChatListener(container, messaging, mapper).afterSingletonsInstantiated();
            var listener = ArgumentCaptor.forClass(MessageListener.class);
            verify(container).addMessageListener(listener.capture(), any(ChannelTopic.class));
            var message = mock(Message.class);
            when(message.getBody()).thenReturn(json.getValue().getBytes(StandardCharsets.UTF_8));
            listener.getValue().onMessage(message, null);
            verify(messaging).convertAndSend(eq("/topic/tickets/7"), any(TicketChatMessageEvent.class));
            verify(messaging).convertAndSend(eq("/topic/chat/inbox/user/12"), any(TicketChatMessageEvent.class));
            assertTrue(json.getValue().contains("createdAt"));
            clearInvocations(messaging);
            var read = TicketChatMessageEvent.builder().eventType("READ").ticketId(7L).readerKey("user:12")
                    .lastReadMessageId(101L).staffReader(false).build();
            when(message.getBody()).thenReturn(mapper.writeValueAsBytes(read));
            listener.getValue().onMessage(message, null);
            verify(messaging).convertAndSend(eq("/topic/tickets/7"), any(TicketChatMessageEvent.class));
            verify(messaging, never()).convertAndSend(eq("/topic/chat/inbox/user/12"), any(TicketChatMessageEvent.class));
        }
    }

    @Test void redisFailureReachesTheKafkaRetryHandler() {
        var redis = mock(StringRedisTemplate.class);
        doThrow(new IllegalStateException("offline")).when(redis).convertAndSend(anyString(), anyString());
        var fanout = new ChatRealtimeFanout(redis, JsonMapper.builder().build());
        assertThrows(IllegalStateException.class, () -> fanout.publish(TicketChatMessageEvent.builder().ticketId(7L).build()));
    }
}
