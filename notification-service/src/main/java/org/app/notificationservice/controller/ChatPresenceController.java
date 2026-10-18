package org.app.notificationservice.controller;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Pattern;
import lombok.RequiredArgsConstructor;
import org.app.notificationservice.client.TicketAccessClient;
import org.app.notificationservice.config.WebSocketAuthorization;
import org.app.notificationservice.service.ChatPresenceService;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.Map;

@RestController @RequestMapping("/api/notifications/chat") @RequiredArgsConstructor
public class ChatPresenceController {
    private final WebSocketAuthorization auth;
    private final TicketAccessClient tickets;
    private final ChatPresenceService presence;
    public record Heartbeat(@Pattern(regexp = "[A-Za-z0-9_-]{16,64}") @jakarta.validation.constraints.NotNull String sessionId,
                            Long ticketId, boolean leave) {}
    private Map<String, Object> context(Long id, WebSocketAuthorization.Identity identity, String token) {
        try { return tickets.context(id, identity.id(), identity.roles(), token == null ? "" : token); }
        catch (feign.FeignException error) {
            throw new ResponseStatusException(error.status() == 403 || error.status() == 404 ? HttpStatus.FORBIDDEN : HttpStatus.SERVICE_UNAVAILABLE);
        }
    }
    @PostMapping("/presence")
    public ResponseEntity<Void> heartbeat(@Valid @RequestBody Heartbeat request,
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestHeader(value = "X-Ticket-Access-Token", required = false) String token) {
        var identity = auth.authenticate(authorization);
        String key;
        if (!identity.id().isEmpty()) key = "user:" + identity.id();
        else {
            if (request.ticketId() == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
            key = (String) context(request.ticketId(), identity, token).get("callerKey");
        }
        presence.heartbeat(key, request.sessionId(), request.leave());
        return ResponseEntity.noContent().build();
    }
    @GetMapping("/presence/{id}")
    public Map<String, Object> snapshot(@PathVariable Long id,
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestHeader(value = "X-Ticket-Access-Token", required = false) String token) {
        var context = context(id, auth.authenticate(authorization), token);
        String customer = (String) context.get("customerKey");
        String staff = (String) context.get("staffKey");
        presence.watch(customer, id); presence.watch(staff, id);
        return Map.of("customerOnline", presence.online(customer), "staffOnline", !staff.isEmpty() && presence.online(staff),
                "assigned", !staff.isEmpty());
    }
}
