package org.app.notificationservice.service.impl;

import lombok.RequiredArgsConstructor;
import org.app.notificationservice.entity.NotificationLog;
import org.app.notificationservice.repository.NotificationRepository;
import org.app.notificationservice.service.NotificationService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class NotificationServiceImpl implements NotificationService {

    private final NotificationRepository notificationRepository;

    @Override
    @Transactional(readOnly = true)
    public List<NotificationLog> getNotificationLogs(String trackingCode) {
        return notificationRepository.findByTrackingCodeOrderBySentAtDesc(trackingCode);
    }

    @Override
    @Transactional(readOnly = true)
    public List<NotificationLog> getMyNotifications(String recipientPhone, String roles) {
        List<NotificationLog> inbox = new ArrayList<>(
                notificationRepository.findTop20ByRecipientPhoneOrderBySentAtDesc(recipientPhone));
        if (isOperationalStaff(roles)) {
            inbox.addAll(notificationRepository.findTop20ByRecipientPhoneOrderBySentAtDesc("SYSTEM_ALERT"));
        }
        inbox.sort(Comparator.comparing(NotificationLog::getSentAt, Comparator.nullsLast(Comparator.reverseOrder())));
        return inbox.size() > 20 ? inbox.subList(0, 20) : inbox;
    }

    @Override
    @Transactional
    public void markAsRead(Long id, String recipientPhone, String roles) {
        notificationRepository.findByIdAndRecipientPhone(id, recipientPhone).ifPresent(this::markRead);
        if (isOperationalStaff(roles)) {
            notificationRepository.findById(id)
                    .filter(notification -> "SYSTEM_ALERT".equals(notification.getRecipientPhone()))
                    .ifPresent(this::markRead);
        }
    }

    @Override
    @Transactional
    public void markAllAsRead(String recipientPhone, String roles) {
        List<NotificationLog> notifications = new ArrayList<>(
                notificationRepository.findByRecipientPhoneAndIsReadFalse(recipientPhone));
        if (isOperationalStaff(roles)) {
            notifications.addAll(notificationRepository.findByRecipientPhoneAndIsReadFalse("SYSTEM_ALERT"));
        }
        notifications.forEach(notification -> notification.setIsRead(true));
        notificationRepository.saveAll(notifications);
    }

    private void markRead(NotificationLog notification) {
        notification.setIsRead(true);
        notificationRepository.save(notification);
    }

    private boolean isOperationalStaff(String roles) {
        if (roles == null || roles.isBlank()) {
            return false;
        }
        String upper = roles.toUpperCase();
        return upper.contains("ADMIN")
                || upper.contains("CS")
                || upper.contains("DISPATCHER")
                || upper.contains("HUB")
                || upper.contains("POST_OFFICE")
                || upper.contains("SHIPPER");
    }
}
