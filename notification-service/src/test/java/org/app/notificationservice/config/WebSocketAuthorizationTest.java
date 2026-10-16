package org.app.notificationservice.config;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import org.app.notificationservice.client.PaymentAccessClient;
import org.app.notificationservice.client.TicketAccessClient;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageDeliveryException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;
import java.util.Date;
import java.util.List;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class WebSocketAuthorizationTest {
    private final StringRedisTemplate redis = mock(StringRedisTemplate.class);
    private final TicketAccessClient tickets = mock(TicketAccessClient.class);
    private final PaymentAccessClient payments = mock(PaymentAccessClient.class);
    private final WebSocketAuthorization authorization = new WebSocketAuthorization(redis, tickets, payments,
            "test-only-signing-key-01234567890123456789012345678901234567890123456789");

    private Message<byte[]> frame(StompCommand command, String destination, WebSocketAuthorization.Identity identity, String token) {
        StompHeaderAccessor headers = StompHeaderAccessor.create(command);
        headers.setDestination(destination);
        headers.setUser(identity);
        if (token != null) headers.setNativeHeader("X-Ticket-Access-Token", token);
        headers.setLeaveMutable(true);
        return MessageBuilder.createMessage(new byte[0], headers.getMessageHeaders());
    }

    @Test void guestSubscriptionMustBeVerifiedAgainstTheTicketCapability() {
        var identity = new WebSocketAuthorization.Identity("", "", null);
        Message<?> allowed = frame(StompCommand.SUBSCRIBE, "/topic/tickets/7", identity, "capability");
        assertSame(allowed, authorization.preSend(allowed, null));
        verify(tickets).checkId(7L, "", "", "capability");
        doThrow(new IllegalArgumentException("denied")).when(tickets).checkId(8L, "", "", "capability");
        assertThrows(IllegalArgumentException.class, () -> authorization.preSend(
                frame(StompCommand.SUBSCRIBE, "/topic/tickets/8", identity, "capability"), null));
    }

    @Test void clientsCannotPublishFakeEventsOrSubscribeToGlobalPrivateTopics() {
        var guest = new WebSocketAuthorization.Identity("", "", null);
        assertThrows(MessageDeliveryException.class, () -> authorization.preSend(
                frame(StompCommand.SEND, "/topic/tickets/7", guest, null), null));
        assertThrows(MessageDeliveryException.class, () -> authorization.preSend(
                frame(StompCommand.SUBSCRIBE, "/topic/notifications", guest, null), null));
        assertThrows(MessageDeliveryException.class, () -> authorization.preSend(
                frame(StompCommand.SUBSCRIBE, "/topic/payments/WB123", guest, null), null));
        verifyNoInteractions(payments);
    }

    @Test void missingRedisStateOrChangedPermissionsInvalidateExistingWebSocketIdentity() {
        @SuppressWarnings("unchecked") ValueOperations<String, String> values = mock(ValueOperations.class);
        when(redis.opsForValue()).thenReturn(values);
        Claims claims = Jwts.claims().add("authVersion", "user-v1")
                .add("roles", List.of("ROLE_CS")).add("roleVersions", Map.of("ROLE_CS", "role-v1"))
                .expiration(new Date(System.currentTimeMillis() + 60000)).build();
        var identity = new WebSocketAuthorization.Identity("7", "ROLE_CS", claims);
        assertFalse(authorization.valid(identity));
        when(values.get("auth:version:user:7")).thenReturn("user-v1");
        when(values.get("auth:version:role:ROLE_CS")).thenReturn("role-v1");
        assertTrue(authorization.valid(identity));
        when(values.get("auth:version:role:ROLE_CS")).thenReturn("revoked");
        assertFalse(authorization.valid(identity));
    }
}
