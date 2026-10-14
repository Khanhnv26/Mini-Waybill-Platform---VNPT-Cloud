package org.app.notificationservice.config;

import org.app.notificationservice.client.PaymentAccessClient;
import org.app.notificationservice.client.TicketAccessClient;
import org.app.sharedevents.entity.TicketChatMessageEvent;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.SpringBootConfiguration;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.WebSocket;
import java.time.LocalDateTime;
import java.util.concurrent.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, classes = WebSocketTransportTest.App.class,
        properties = {"app.jwt.secret=test-only-key-012345678901234567890123456789012345678901234567890123",
                "app.websocket.allowed-origins=http://localhost:*", "eureka.client.enabled=false",
                "spring.cloud.discovery.enabled=false", "spring.flyway.enabled=false"})
class WebSocketTransportTest {
    @org.springframework.context.annotation.Configuration
    @EnableAutoConfiguration(excludeName = "org.springframework.boot.jdbc.autoconfigure.DataSourceAutoConfiguration")
    @Import({WebSocketConfig.class, WebSocketAuthorization.class})
    static class App {
        @Bean StringRedisTemplate redis() { return mock(StringRedisTemplate.class); }
        @Bean TicketAccessClient tickets() { return mock(TicketAccessClient.class); }
        @Bean PaymentAccessClient payments() { return mock(PaymentAccessClient.class); }
    }

    @LocalServerPort int port;
    @Autowired SimpMessagingTemplate broker;
    @Autowired TicketAccessClient tickets;
    @Autowired org.springframework.messaging.simp.broker.SimpleBrokerMessageHandler simpleBroker;

    static class Frames implements WebSocket.Listener {
        final BlockingQueue<String> frames = new LinkedBlockingQueue<>();
        final StringBuilder text = new StringBuilder();
        @Override public void onOpen(WebSocket socket) { socket.request(1); }
        @Override public CompletionStage<?> onText(WebSocket socket, CharSequence data, boolean last) {
            text.append(data);
            if (last) { frames.add(text.toString()); text.setLength(0); }
            socket.request(1);
            return CompletableFuture.completedFuture(null);
        }
        String await(String command) throws InterruptedException {
            long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(5);
            while (System.nanoTime() < deadline) {
                String frame = frames.poll(100, TimeUnit.MILLISECONDS);
                if (frame != null && frame.startsWith(command)) return frame;
            }
            fail("Did not receive " + command + " within five seconds");
            return null;
        }
    }

    @Test void realWebSocketUpgradeAndTicketBroadcastWorkAndForeignTicketSubscriptionIsDenied() throws Exception {
        Frames firstFrames = new Frames(), secondFrames = new Frames();
        URI uri = URI.create("ws://localhost:" + port + "/api/notifications/ws/websocket");
        HttpClient client = HttpClient.newHttpClient();
        WebSocket first = client.newWebSocketBuilder().header("Origin", "http://localhost:" + port)
                .buildAsync(uri, firstFrames).get(5, TimeUnit.SECONDS);
        WebSocket second = client.newWebSocketBuilder().header("Origin", "http://localhost:" + port)
                .buildAsync(uri, secondFrames).get(5, TimeUnit.SECONDS);
        try {
            first.sendText("CONNECT\naccept-version:1.2\nhost:localhost\n\n\0", true).join();
            second.sendText("CONNECT\naccept-version:1.2\nhost:localhost\n\n\0", true).join();
            firstFrames.await("CONNECTED"); secondFrames.await("CONNECTED");
            String subscribe = "SUBSCRIBE\nid:ticket\ndestination:/topic/tickets/7\nX-Ticket-Access-Token:capability\n\n\0";
            first.sendText(subscribe, true).join(); second.sendText(subscribe, true).join();
            var headers = org.springframework.messaging.simp.SimpMessageHeaderAccessor.create(
                    org.springframework.messaging.simp.SimpMessageType.MESSAGE);
            headers.setDestination("/topic/tickets/7");
            var subscriptionProbe = org.springframework.messaging.support.MessageBuilder.createMessage(new byte[0], headers.getMessageHeaders());
            long subscribedDeadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(5);
            while (simpleBroker.getSubscriptionRegistry().findSubscriptions(subscriptionProbe).size() < 2
                    && System.nanoTime() < subscribedDeadline) Thread.sleep(20);
            assertEquals(2, simpleBroker.getSubscriptionRegistry().findSubscriptions(subscriptionProbe).size());
            broker.convertAndSend("/topic/tickets/7", TicketChatMessageEvent.builder().ticketId(7L)
                    .messageId(12L).content("hello").createdAt(LocalDateTime.now()).build());
            assertTrue(firstFrames.await("MESSAGE").contains("hello"));
            assertTrue(secondFrames.await("MESSAGE").contains("hello"));
            doThrow(new IllegalArgumentException("access denied")).when(tickets).checkId(8L, "", "", "capability");
            first.sendText("SUBSCRIBE\nid:foreign\ndestination:/topic/tickets/8\nX-Ticket-Access-Token:capability\n\n\0", true).join();
            assertTrue(firstFrames.await("ERROR").contains("ERROR"));
        } finally { first.abort(); second.abort(); }
    }
}
