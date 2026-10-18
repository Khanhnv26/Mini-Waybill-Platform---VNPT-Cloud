package org.app.notificationservice.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;

@FeignClient(name = "support-service", contextId = "ticketAccessClient")
public interface TicketAccessClient {
    @GetMapping("/api/tickets/{id}/chat-context")
    java.util.Map<String, Object> context(@PathVariable("id") Long id, @RequestHeader("X-User-Id") String userId,
                 @RequestHeader("X-User-Roles") String roles, @RequestHeader("X-Ticket-Access-Token") String guestToken);
    @GetMapping("/api/tickets/{id}/access")
    void checkId(@PathVariable("id") Long id, @RequestHeader("X-User-Id") String userId,
                 @RequestHeader("X-User-Roles") String roles, @RequestHeader("X-Ticket-Access-Token") String guestToken);
    @GetMapping("/api/tickets/code/{code}/access")
    void checkCode(@PathVariable("code") String code, @RequestHeader("X-User-Id") String userId,
                   @RequestHeader("X-User-Roles") String roles, @RequestHeader("X-Ticket-Access-Token") String guestToken);
}
