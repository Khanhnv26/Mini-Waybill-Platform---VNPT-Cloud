package org.app.notificationservice.repository;

import org.app.notificationservice.entity.NotificationLog;
import org.springframework.data.jpa.repository.JpaRepository;

import javax.management.Notification;
import java.util.List;
import java.util.Optional;


public interface NotificationRepository extends JpaRepository<NotificationLog, Long> {
    List<NotificationLog> findByTrackingCodeOrderBySentAtDesc(String trackingCode);
    List<NotificationLog> findTop20ByRecipientPhoneOrderBySentAtDesc(String recipientPhone);
    Optional<NotificationLog> findByIdAndRecipientPhone(Long id, String recipientPhone);
    List<NotificationLog> findByRecipientPhoneAndIsReadFalse(String recipientPhone);
}
