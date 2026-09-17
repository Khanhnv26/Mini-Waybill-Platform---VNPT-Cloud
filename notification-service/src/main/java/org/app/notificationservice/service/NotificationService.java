package org.app.notificationservice.service;

import org.app.notificationservice.entity.NotificationLog;

import java.util.List;

public interface NotificationService {
    List<NotificationLog> getNotificationLogs(String trackingCode);
    List<NotificationLog> getMyNotifications(String recipientPhone);
    void markAsRead(Long id, String recipientPhone);
    void markAllAsRead(String recipientPhone);
}
