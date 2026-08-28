package org.app.notificationservice.consumer;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.app.notificationservice.dto.event.CreateShipmentEvent;
import org.app.notificationservice.dto.event.RouteAssignedEvent;
import org.app.notificationservice.entity.NotificationLog;
import org.app.notificationservice.repository.NotificationRepository;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Slf4j
@RequiredArgsConstructor
@Service
public class NotificationConsumer {

    private final NotificationRepository notificationRepository;

    @KafkaListener(topics = "shipment-events", groupId = "notification-group")
    public void handleShipmentCreated(CreateShipmentEvent event) {

        log.info("[NOTIFICATION] Đang gửi SMS tạo đơn thành công tới khách: {}", event.getSenderPhone());
        String message = String.format("Chao %s, don hang %s cua ban da duoc tao thanh cong!",
                event.getSenderName(), event.getTrackingCode());

        NotificationLog noti = NotificationLog.builder()
                .trackingCode(event.getTrackingCode())
                .recipientPhone(event.getSenderPhone())
                .type("SMS")
                .title("Tao don hang thanh cong")
                .message(message)
                .status("SENT")
                .sentAt(LocalDateTime.now())
                .build();

        notificationRepository.save(noti);
        log.info("[NOTIFICATION] Da gui va luu log SMS cho don {}", event.getTrackingCode());
    }

    @KafkaListener(topics = "route-assigned", groupId = "notification-group")
    public void handleRouteAssignedEvent(RouteAssignedEvent event) {
        log.info("[NOTIFICATION] Đang gửi thong bao phan tuyen cho don: {}", event.getTrackingCode());

        String message = String.format("Don hang %s da duoc phan tuyen tu %s den %s (Lo trinh: %s)",
                event.getTrackingCode(), event.getSourceHub(), event.getDestinationHub(), event.getRouteCode());

        NotificationLog noti = NotificationLog.builder()
                .trackingCode(event.getTrackingCode())
                .recipientPhone("SYSTEM_ALERT")
                .type("EMAIL")
                .title("Thong bao phan tuyen van don")
                .message(message)
                .status("SENT")
                .sentAt(LocalDateTime.now())
                .build();

        notificationRepository.save(noti);
        log.info("[NOTIFICATION] Da gui va luu log phan tuyen cho don {}", event.getTrackingCode());

    }
}
