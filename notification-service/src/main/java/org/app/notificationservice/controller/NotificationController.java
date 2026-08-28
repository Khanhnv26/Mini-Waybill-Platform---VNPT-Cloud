package org.app.notificationservice.controller;

import lombok.RequiredArgsConstructor;
import org.app.notificationservice.entity.NotificationLog;
import org.app.notificationservice.service.NotificationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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
}