package org.app.notificationservice.service.impl;

import lombok.RequiredArgsConstructor;
import org.app.notificationservice.entity.NotificationLog;
import org.app.notificationservice.repository.NotificationRepository;
import org.app.notificationservice.service.NotificationService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
    public List<NotificationLog> getMyNotifications(String recipientPhone) {
        return notificationRepository.findTop20ByRecipientPhoneOrderBySentAtDesc(recipientPhone);
    }

    @Override
    @Transactional
    public void markAsRead(Long id, String recipientPhone) {
        notificationRepository.findByIdAndRecipientPhone(id, recipientPhone).ifPresent(notification -> {
            notification.setIsRead(true);
            notificationRepository.save(notification);
        });
    }

    @Override
    @Transactional
    public void markAllAsRead(String recipientPhone) {
        List<NotificationLog> notifications = notificationRepository.findByRecipientPhoneAndIsReadFalse(recipientPhone);
        notifications.forEach(notification -> notification.setIsRead(true));
        notificationRepository.saveAll(notifications);
    }
}
