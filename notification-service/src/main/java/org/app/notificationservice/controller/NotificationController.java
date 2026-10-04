package org.app.notificationservice.controller;

import lombok.RequiredArgsConstructor;
import org.app.notificationservice.entity.NotificationLog;
import org.app.notificationservice.service.NotificationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/notifications")
public class NotificationController {
    private final NotificationService notificationService;
    private final org.app.notificationservice.service.TelegramService telegramService;

    @GetMapping("/{trackingCode}")
    public ResponseEntity<List<NotificationLog>> getNotificationsByTrackingCode(@PathVariable String trackingCode) {
        return ResponseEntity.ok(notificationService.getNotificationLogs(trackingCode));
    }

    @GetMapping
    public ResponseEntity<List<NotificationLog>> getMyNotifications(
            @RequestHeader(value = "X-User-Email", required = false) String userEmail,
            @RequestHeader(value = "X-User-Roles", required = false) String roles) {
        if (userEmail == null || userEmail.isBlank() || "null".equalsIgnoreCase(userEmail)) {
            return ResponseEntity.ok(Collections.emptyList());
        }
        return ResponseEntity.ok(notificationService.getMyNotifications(userEmail.trim(), roles));
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<Void> markAsRead(
            @PathVariable Long id,
            @RequestHeader(value = "X-User-Email", required = false) String userEmail,
            @RequestHeader(value = "X-User-Roles", required = false) String roles) {
        if (userEmail != null && !userEmail.isBlank() && !"null".equalsIgnoreCase(userEmail)) {
            notificationService.markAsRead(id, userEmail.trim(), roles);
        }
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/read-all")
    public ResponseEntity<Void> markAllAsRead(
            @RequestHeader(value = "X-User-Email", required = false) String userEmail,
            @RequestHeader(value = "X-User-Roles", required = false) String roles) {
        if (userEmail != null && !userEmail.isBlank() && !"null".equalsIgnoreCase(userEmail)) {
            notificationService.markAllAsRead(userEmail.trim(), roles);
        }
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/telegram/send")
    public ResponseEntity<java.util.Map<String, Object>> sendTelegramMessage(@RequestBody java.util.Map<String, String> payload) {
        String chatId = payload != null ? payload.get("chatId") : null;
        String message = payload != null ? payload.get("message") : null;
        if (chatId != null && !chatId.isBlank() && message != null && !message.isBlank()) {
            telegramService.sendMessage(chatId, message);
            return ResponseEntity.ok(java.util.Map.of("success", true, "message", "Đã gửi thông báo Telegram"));
        }
        return ResponseEntity.badRequest().body(java.util.Map.of("success", false, "error", "chatId và message không được để trống"));
    }
}
