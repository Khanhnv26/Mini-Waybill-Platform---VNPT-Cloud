package org.app.supportservice.controller;

import lombok.RequiredArgsConstructor;
import org.app.supportservice.service.TicketChatService;
import org.app.supportservice.service.TicketChatService.Caller;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController @RequestMapping("/api/tickets") @RequiredArgsConstructor
public class TicketChatController {
    private final TicketChatService chat;
    private Caller caller(HttpHeaders headers) {
        String id = headers.getFirst("X-User-Id");
        return new Caller(id == null || id.isBlank() ? null : Long.valueOf(id),
                headers.getFirst("X-User-Roles"), headers.getFirst("X-Ticket-Access-Token"));
    }
    @GetMapping("/{id}/messages")
    public TicketChatService.MessagePage messages(@PathVariable Long id, @RequestParam(required = false) Long beforeId,
            @RequestParam(required = false) Long afterId, @RequestParam(defaultValue = "50") int limit, @RequestHeader HttpHeaders headers) {
        return chat.page(id, beforeId, afterId, limit, caller(headers));
    }
    public record ReadRequest(long lastReadMessageId) {}
    @PutMapping("/{id}/read")
    public TicketChatService.ReadStatus read(@PathVariable Long id, @RequestBody ReadRequest request, @RequestHeader HttpHeaders headers) {
        return chat.mark(id, request.lastReadMessageId(), false, caller(headers));
    }
    @PutMapping("/{id}/notifications/read")
    public TicketChatService.ReadStatus dismiss(@PathVariable Long id, @RequestBody ReadRequest request, @RequestHeader HttpHeaders headers) {
        return chat.mark(id, request.lastReadMessageId(), true, caller(headers));
    }
    @GetMapping("/{id}/chat-context")
    public Map<String, Object> context(@PathVariable Long id, @RequestHeader HttpHeaders headers) {
        return chat.context(id, caller(headers));
    }
    @GetMapping("/chat/inbox")
    public List<TicketChatService.Notice> inbox(@RequestParam(required = false) Long ticketId, @RequestHeader HttpHeaders headers) {
        return chat.inbox(caller(headers), ticketId);
    }
    @GetMapping("/chat/summary")
    public List<TicketChatService.Summary> summary(@RequestParam(required = false) Long ticketId, @RequestHeader HttpHeaders headers) {
        return ticketId == null ? chat.summary(caller(headers)) : chat.guestSummary(ticketId, caller(headers));
    }
}
