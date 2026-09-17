package org.app.notificationservice.config;

import com.fasterxml.jackson.databind.ObjectMapper;
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
                messagingTemplate.convertAndSend("/topic/tracking/" + event.getTrackingCode(), event);
                log.info("[WEBSOCKET-CLUSTER] Node đã broadcast thành công event cho đơn: {}", event.getTrackingCode());
            } catch (Exception e) {
                log.error("[WEBSOCKET-CLUSTER] Lỗi parse/broadcast tin nhắn từ Redis: {}", e.getMessage(), e);
            }
        };
    }
}
