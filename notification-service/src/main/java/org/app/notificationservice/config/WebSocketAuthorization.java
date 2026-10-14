package org.app.notificationservice.config;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.app.notificationservice.client.PaymentAccessClient;
import org.app.notificationservice.client.TicketAccessClient;
import org.app.sharedevents.security.RoleAccess;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.messaging.*;
import org.springframework.messaging.simp.stomp.*;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;
import java.nio.charset.StandardCharsets;
import java.security.Principal;
import java.util.List;
import java.util.Map;

@Component
public class WebSocketAuthorization implements ChannelInterceptor {
    private final StringRedisTemplate redis;
    private final TicketAccessClient tickets;
    private final PaymentAccessClient payments;
    private final javax.crypto.SecretKey signingKey;

    public WebSocketAuthorization(StringRedisTemplate redis, TicketAccessClient tickets, PaymentAccessClient payments,
                                 @Value("${app.jwt.secret}") String secret) {
        this.redis = redis; this.tickets = tickets; this.payments = payments;
        this.signingKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    public record Identity(String id, String roles, Claims claims) implements Principal {
        @Override public String getName() { return id.isEmpty() ? "guest" : "user:" + id; }
        @Override public String toString() { return getName(); }
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor headers = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (headers == null) return message;
        if (StompCommand.CONNECT.equals(headers.getCommand())) {
            String authorization = headers.getFirstNativeHeader("Authorization");
            Identity identity = new Identity("", "", null);
            if (authorization != null && !authorization.isBlank()) {
                if (!authorization.startsWith("Bearer ")) throw denied(message);
                Claims claims = Jwts.parser().verifyWith(signingKey).build()
                        .parseSignedClaims(authorization.substring(7)).getPayload();
                List<?> roles = claims.get("roles", List.class);
                identity = new Identity(String.valueOf(claims.get("userId")),
                        roles == null ? "" : String.join(",", roles.stream().map(Object::toString).toList()), claims);
                if (!valid(identity)) throw denied(message);
            }
            headers.setUser(identity);
        } else if (StompCommand.SEND.equals(headers.getCommand())) {
            throw denied(message); // This broker distributes server events only.
        } else if (StompCommand.SUBSCRIBE.equals(headers.getCommand())) {
            if (!(headers.getUser() instanceof Identity identity) || !valid(identity)) throw denied(message);
            authorize(headers.getDestination(), identity, headers.getFirstNativeHeader("X-Ticket-Access-Token"), message);
        }
        return message;
    }

    public boolean valid(Identity identity) {
        if (identity.claims() == null) return identity.id().isEmpty();
        Claims claims = identity.claims();
        if (claims.getExpiration() == null || claims.getExpiration().getTime() <= System.currentTimeMillis()) return false;
        if (Boolean.TRUE.equals(redis.hasKey("auth:blacklist:user:" + identity.id()))) return false;
        if (Boolean.TRUE.equals(redis.hasKey("auth:pending:user:" + identity.id()))) return false;
        if (!version("auth:version:user:" + identity.id()).equals(claims.get("authVersion", String.class))) return false;
        Map<?, ?> roleVersions = claims.get("roleVersions", Map.class);
        List<?> roles = claims.get("roles", List.class);
        if (roleVersions == null || roles == null) return false;
        for (Object role : roles) {
            if (Boolean.TRUE.equals(redis.hasKey("auth:pending:role:" + role))) return false;
            if (!version("auth:version:role:" + role).equals(roleVersions.get(role))) return false;
        }
        return true;
    }

    private String version(String key) { String value = redis.opsForValue().get(key); return value == null ? "" : value; }

    private void authorize(String destination, Identity identity, String token, Message<?> message) {
        if (destination == null) throw denied(message);
        String guestToken = token == null ? "" : token;
        if (destination.matches("/topic/tickets/\\d+")) {
            tickets.checkId(Long.parseLong(destination.substring("/topic/tickets/".length())), identity.id(), identity.roles(), guestToken);
        } else if (destination.matches("/topic/tickets/code/[A-Za-z0-9_-]{1,80}")) {
            tickets.checkCode(destination.substring("/topic/tickets/code/".length()), identity.id(), identity.roles(), guestToken);
        } else if (destination.matches("/topic/tracking/[A-Za-z0-9_-]{1,80}")) {
            // Public tracking events contain only shipment status, never personal information.
        } else if (!identity.id().isEmpty() && destination.matches("/topic/payments/[A-Za-z0-9_-]{1,80}")) {
            payments.check(destination.substring("/topic/payments/".length()), identity.id(), identity.roles());
        } else if (!identity.id().isEmpty() && destination.equals("/topic/notifications/broadcast")) {
            // Refresh signal contains no resource data.
        } else if (destination.equals("/topic/notifications")
                && RoleAccess.hasAny(identity.roles(), "ADMIN", "CS", "POST_OFFICE_OPERATOR", "POST_OFFICE_STAFF")) {
            // Financial notifications are limited to authorized office staff.
        } else if (RoleAccess.hasAny(identity.roles(), "ADMIN", "CS", "DISPATCHER", "HUB_OPERATOR", "POST_OFFICE_OPERATOR", "POST_OFFICE_STAFF", "SHIPPER")
                && destination.matches("/topic/trips/[A-Za-z0-9_-]+")) {
            // Operational topics are staff-only.
        } else throw denied(message);
    }

    private MessageDeliveryException denied(Message<?> message) {
        return new MessageDeliveryException(message, "Không có quyền truy cập kênh này");
    }
}
