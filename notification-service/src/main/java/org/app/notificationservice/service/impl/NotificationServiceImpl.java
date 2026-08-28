package org.app.notificationservice.service.impl;

import lombok.RequiredArgsConstructor;
import org.app.notificationservice.entity.NotificationLog;
import org.app.notificationservice.repository.NotificationRepository;
import org.app.notificationservice.service.NotificationService;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
@RequiredArgsConstructor
public class NotificationServiceImpl implements NotificationService {

    private final NotificationRepository notificationRepository;

    @Override
    public List<NotificationLog> getNotificationLogs(String trackingCode) {
        return notificationRepository.findByTrackingCodeOrderBySentAtDesc(trackingCode);
    }
}
