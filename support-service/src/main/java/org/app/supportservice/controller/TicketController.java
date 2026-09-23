package org.app.supportservice.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.app.supportservice.dto.request.AddMessageRequest;
import org.app.supportservice.dto.request.CreateTicketRequest;
import org.app.supportservice.dto.request.ResolveTicketRequest;
import org.app.supportservice.dto.response.MessageResponse;
import org.app.supportservice.dto.response.TicketResponse;
import org.app.supportservice.service.TicketService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Locale;

@RestController
@RequestMapping("/api/tickets")
@RequiredArgsConstructor
public class TicketController {

    private final TicketService ticketService;

    @PostMapping
    public ResponseEntity<TicketResponse> createTicket(
            @Valid @RequestBody CreateTicketRequest request,
            @RequestHeader(value = "X-User-Id", required = false) String headerUserId,
            @RequestHeader(value = "X-User-Email", required = false) String headerEmail) {
        Long userId = parseUserId(headerUserId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ticketService.createTicket(request, userId, headerEmail));
    }


    @GetMapping("/my-tickets")
    public ResponseEntity<List<TicketResponse>> getMyTickets(
            @RequestHeader(value = "X-User-Id", required = false) String headerUserId) {
        Long userId = parseUserId(headerUserId);
        if (userId == null) {
            return ResponseEntity.ok(List.of());
        }
        return ResponseEntity.ok(ticketService.getMyTickets(userId));
    }


    @GetMapping
    public ResponseEntity<List<TicketResponse>> getAllTickets(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String trackingCode) {
        return ResponseEntity.ok(ticketService.getAllTickets(status, trackingCode));
    }

    @GetMapping("/{id}")
    public ResponseEntity<TicketResponse> getTicketById(@PathVariable Long id) {
        return ResponseEntity.ok(ticketService.getTicketById(id));
    }

    @GetMapping("/code/{ticketCode}")
    public ResponseEntity<TicketResponse> getTicketByCode(@PathVariable String ticketCode) {
        return ResponseEntity.ok(ticketService.getTicketByCode(ticketCode));
    }


    @PutMapping("/{id}/assign")
    public ResponseEntity<TicketResponse> assignTicket(
            @PathVariable Long id,
            @RequestHeader(value = "X-User-Id", required = false) String headerUserId,
            @RequestParam(defaultValue = "Nhân viên CSKH") String csName) {
        Long csUserId = parseUserId(headerUserId);
        return ResponseEntity.ok(ticketService.assignTicket(id, csUserId, csName));
    }

    //CSKH chốt phương án bồi thường & giải quyết
    @PutMapping("/{id}/resolve")
    public ResponseEntity<TicketResponse> resolveTicket(
            @PathVariable Long id,
            @Valid @RequestBody ResolveTicketRequest request) {
        return ResponseEntity.ok(ticketService.resolveTicket(id, request));
    }

    //Gửi thêm tin nhắn vào ticket
    @PostMapping("/{id}/messages")
    public ResponseEntity<MessageResponse> addMessage(
            @PathVariable Long id,
            @Valid @RequestBody AddMessageRequest request,
            @RequestHeader(value = "X-User-Id", required = false) String headerUserId,
            @RequestHeader(value = "X-User-Roles", required = false) String headerRoles) {
        Long senderId = parseUserId(headerUserId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ticketService.addMessage(id, request, senderId != null ? senderId : 0L, resolveSenderRole(headerRoles)));
    }

    private String resolveSenderRole(String headerRoles) {
        if (headerRoles == null || headerRoles.isBlank()) {
            return "CUSTOMER";
        }
        boolean staff = false;
        boolean admin = false;
        for (String part : headerRoles.split(",")) {
            String role = part.trim().toUpperCase(Locale.ROOT);
            if ("ROLE_ADMIN".equals(role) || "ADMIN".equals(role)) {
                admin = true;
            } else if ("ROLE_CS".equals(role) || "CS".equals(role)) {
                staff = true;
            }
        }
        if (admin) {
            return "ROLE_ADMIN";
        }
        if (staff) {
            return "ROLE_CS";
        }
        return "CUSTOMER";
    }

    private Long parseUserId(String headerUserId) {
        if (headerUserId != null && !headerUserId.isBlank()) {
            try {
                return Long.parseLong(headerUserId.trim());
            } catch (NumberFormatException ignored) {}
        }
        return null;
    }
}
