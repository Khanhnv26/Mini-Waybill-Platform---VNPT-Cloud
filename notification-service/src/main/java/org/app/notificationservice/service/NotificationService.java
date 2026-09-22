package org.app.notificationservice.service;

import org.app.notificationservice.entity.NotificationLog;

import java.util.List;

public interface NotificationService {
    List<NotificationLog> getNotificationLogs(String trackingCode);
    List<NotificationLog> getMyNotifications(String recipientPhone, String roles);
    void markAsRead(Long id, String recipientPhone, String roles);
    void markAllAsRead(String recipientPhone, String roles);
}
