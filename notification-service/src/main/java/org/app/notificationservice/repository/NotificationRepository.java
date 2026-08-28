package org.app.notificationservice.repository;

import org.app.notificationservice.entity.NotificationLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;


public interface NotificationRepository extends JpaRepository<NotificationLog, Long> {
    List<NotificationLog> findByTrackingCodeOrderBySentAtDesc(String trackingCode);
}
