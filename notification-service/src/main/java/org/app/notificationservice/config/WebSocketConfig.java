package org.app.notificationservice.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {
    private final WebSocketAuthorization authorization;
    private final String[] origins;

    public WebSocketConfig(WebSocketAuthorization authorization,
            @org.springframework.beans.factory.annotation.Value("${app.websocket.allowed-origins:http://localhost:*,http://127.0.0.1:*}") String origins) {
        this.authorization = authorization;
        this.origins = origins.split(",");
    }

    @Override
    public void configureClientInboundChannel(org.springframework.messaging.simp.config.ChannelRegistration registration) {
        registration.taskExecutor().corePoolSize(2).maxPoolSize(4).queueCapacity(200);
        registration.interceptors(authorization);
    }

    @Override
    public void configureWebSocketTransport(org.springframework.web.socket.config.annotation.WebSocketTransportRegistration registration) {
        registration.setMessageSizeLimit(16 * 1024).setSendBufferSizeLimit(256 * 1024).setSendTimeLimit(15000);
    }

    @Override
    public void configureClientOutboundChannel(org.springframework.messaging.simp.config.ChannelRegistration registration) {
        registration.interceptors(new org.springframework.messaging.support.ChannelInterceptor() {
            @Override public org.springframework.messaging.Message<?> preSend(org.springframework.messaging.Message<?> message,
                    org.springframework.messaging.MessageChannel channel) {
                var headers = org.springframework.messaging.simp.SimpMessageHeaderAccessor.wrap(message);
                if (headers.getUser() instanceof WebSocketAuthorization.Identity identity) {
                    try { if (!authorization.valid(identity)) return null; }
                    catch (RuntimeException e) { return null; }
                }
                return message;
            }
        });
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        config.enableSimpleBroker("/topic");
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // CORS do api-gateway (CorsFilter) xu ly duy nhat. Neu SockJS cung them header Access-Control-Allow-Origin,
        // gateway se forward ca 2 -> header bi lap "origin, origin" va trinh duyet chan.
        registry.addEndpoint("/ws", "/api/notifications/ws")
                .setAllowedOriginPatterns(origins)
                .withSockJS()
                .setSuppressCors(true);
    }


}
