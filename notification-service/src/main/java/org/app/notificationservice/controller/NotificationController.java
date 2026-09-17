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

    @GetMapping("/{trackingCode}")
    public ResponseEntity<List<NotificationLog>> getNotificationsByTrackingCode(@PathVariable String trackingCode) {
        return ResponseEntity.ok(notificationService.getNotificationLogs(trackingCode));
    }

    @GetMapping
    public ResponseEntity<List<NotificationLog>> getMyNotifications(
            @RequestHeader(value = "X-User-Email", required = false) String userEmail) {
        if (userEmail == null || userEmail.isBlank() || "null".equalsIgnoreCase(userEmail)) {
            return ResponseEntity.ok(Collections.emptyList());
        }
        return ResponseEntity.ok(notificationService.getMyNotifications(userEmail.trim()));
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<Void> markAsRead(
            @PathVariable Long id,
            @RequestHeader(value = "X-User-Email", required = false) String userEmail) {
        if (userEmail != null && !userEmail.isBlank() && !"null".equalsIgnoreCase(userEmail)) {
            notificationService.markAsRead(id, userEmail.trim());
        }
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/read-all")
    public ResponseEntity<Void> markAllAsRead(
            @RequestHeader(value = "X-User-Email", required = false) String userEmail) {
        if (userEmail != null && !userEmail.isBlank() && !"null".equalsIgnoreCase(userEmail)) {
            notificationService.markAllAsRead(userEmail.trim());
        }
        return ResponseEntity.noContent().build();
    }
}