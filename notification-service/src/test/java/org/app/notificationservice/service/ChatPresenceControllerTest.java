package org.app.notificationservice.service;

import org.app.notificationservice.client.TicketAccessClient;
import org.app.notificationservice.config.WebSocketAuthorization;
import org.app.notificationservice.controller.ChatPresenceController;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;
import java.util.Map;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;

class ChatPresenceControllerTest {
    @Test void guestMustProveAccessBeforeUpdatingOrReadingPresence() {
        var auth = mock(WebSocketAuthorization.class);
        var tickets = mock(TicketAccessClient.class);
        var presence = mock(ChatPresenceService.class);
        var controller = new ChatPresenceController(auth, tickets, presence);
        when(auth.authenticate(null)).thenReturn(new WebSocketAuthorization.Identity("", "", null));
        assertThrows(ResponseStatusException.class, () -> controller.heartbeat(
                new ChatPresenceController.Heartbeat("session_guest_001", null, false), null, "secret"));
        verifyNoInteractions(presence);
        when(tickets.context(7L, "", "", "secret")).thenReturn(Map.of("callerKey", "guest:7",
                "customerKey", "guest:7", "staffKey", "user:20"));
        controller.heartbeat(new ChatPresenceController.Heartbeat("session_guest_001", 7L, false), null, "secret");
        verify(presence).heartbeat("guest:7", "session_guest_001", false);
        controller.snapshot(7L, null, "secret");
        verify(tickets, times(2)).context(7L, "", "", "secret");
        verify(presence).watch("guest:7", 7L); verify(presence).watch("user:20", 7L);
    }
}
