package org.app.notificationservice.config;

import tools.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.app.notificationservice.dto.event.ShipmentStatusUpdatedEvent;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.MessageListener;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.listener.ChannelTopic;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;
import org.springframework.messaging.simp.SimpMessagingTemplate;

@Slf4j
@Configuration
public class RedisPubSubConfig {

    public static final String TRACKING_WS_TOPIC = "ws-tracking-channel";

    @Bean
    public RedisMessageListenerContainer redisMessageListenerContainer(
            RedisConnectionFactory connectionFactory,
            MessageListener trackingMessageListener) {
        RedisMessageListenerContainer container = new RedisMessageListenerContainer();
        container.setConnectionFactory(connectionFactory);
        container.addMessageListener(trackingMessageListener, new ChannelTopic(TRACKING_WS_TOPIC));
        return container;
    }

    @Bean
    public MessageListener trackingMessageListener(
            SimpMessagingTemplate messagingTemplate,
            ObjectMapper objectMapper) {
        return (message, pattern) -> {
            try {
                ShipmentStatusUpdatedEvent event = objectMapper.readValue(message.getBody(), ShipmentStatusUpdatedEvent.class);
                messagingTemplate.convertAndSend("/topic/tracking/" + event.getTrackingCode(), org.app.notificationservice.dto.response.PublicTrackingEvent.from(event));
                log.info("[WEBSOCKET-CLUSTER] Node đã broadcast thành công event cho đơn: {}", event.getTrackingCode());
            } catch (Exception e) {
                log.error("[WEBSOCKET-CLUSTER] Lỗi parse/broadcast tin nhắn từ Redis: {}", e.getMessage(), e);
            }
        };
    }

    @Bean
    public org.springframework.beans.factory.SmartInitializingSingleton registerChatListener(
            RedisMessageListenerContainer container, SimpMessagingTemplate messaging, ObjectMapper mapper) {
        return () -> container.addMessageListener((message, pattern) -> {
            try {
                var event = mapper.readValue(message.getBody(), org.app.sharedevents.entity.TicketChatMessageEvent.class);
                if (event.getTicketId() != null) messaging.convertAndSend("/topic/tickets/" + event.getTicketId(), event);
                if (event.getTicketCode() != null) messaging.convertAndSend("/topic/tickets/code/" + event.getTicketCode(), event);
                String audience = event.getAudienceKey();
                if (audience != null && "MESSAGE".equals(event.getEventType())) {
                    messaging.convertAndSend("/topic/chat/inbox/" + audience.replace(':', '/'), event);
                }
            } catch (Exception error) { log.warn("Cannot fan out chat event", error); }
        }, new ChannelTopic(org.app.notificationservice.service.ChatRealtimeFanout.CHANNEL));
    }
}
