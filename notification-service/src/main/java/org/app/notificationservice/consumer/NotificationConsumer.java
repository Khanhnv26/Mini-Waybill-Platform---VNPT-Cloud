package org.app.notificationservice.consumer;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.app.notificationservice.dto.event.CreateShipmentEvent;
import org.app.notificationservice.dto.event.RouteAssignedEvent;
import org.app.notificationservice.dto.event.SendEmailEvent;
import org.app.notificationservice.entity.NotificationLog;
import org.app.notificationservice.repository.NotificationRepository;
import org.app.notificationservice.service.EmailService;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Slf4j
@RequiredArgsConstructor
@Service
public class NotificationConsumer {

    private final NotificationRepository notificationRepository;
    private final EmailService emailService;

    @KafkaListener(topics = "shipment-events", groupId = "notification-group")
    public void handleShipmentCreated(CreateShipmentEvent event) {

        log.info("[NOTIFICATION] Đang gửi SMS tạo đơn thành công tới khách: {}", event.getSenderPhone());
        String message = String.format("Chào %s, đơn hàng %s của bạn đã được tạo thành công!",
                event.getSenderName(), event.getTrackingCode());

        NotificationLog noti = NotificationLog.builder()
                .trackingCode(event.getTrackingCode())
                .recipientPhone(event.getSenderPhone())
                .type("SMS")
                .title("Tạo đơn hàng thành công")
                .message(message)
                .status("SENT")
                .sentAt(LocalDateTime.now())
                .build();

        notificationRepository.save(noti);
        log.info("[NOTIFICATION] Đã gửi và lưu log SMS cho đơn {}", event.getTrackingCode());
    }

    @KafkaListener(topics = "route-assigned", groupId = "notification-group")
    public void handleRouteAssignedEvent(RouteAssignedEvent event) {
        log.info("[NOTIFICATION] Đang gửi thông báo phân tuyến cho đơn: {}", event.getTrackingCode());

        String message = String.format("Đơn hàng %s đã được phân tuyến từ %s đến %s (Lộ trình: %s)",
                event.getTrackingCode(), event.getSourceHub(), event.getDestinationHub(), event.getRouteCode());

        NotificationLog noti = NotificationLog.builder()
                .trackingCode(event.getTrackingCode())
                .recipientPhone("SYSTEM_ALERT")
                .type("EMAIL")
                .title("Thông báo phân tuyến vận đơn")
                .message(message)
                .status("SENT")
                .sentAt(LocalDateTime.now())
                .build();

        notificationRepository.save(noti);
        log.info("[NOTIFICATION] Da gui va luu log phan tuyen cho don {}", event.getTrackingCode());
    }

    @KafkaListener(topics = "tracking-status-events", groupId = "notification-group")
    public void handleStatusUpdatedEvent(org.app.notificationservice.dto.event.ShipmentStatusUpdatedEvent event) {
        log.info("[NOTIFICATION] Đang gửi thông báo cập nhật trạng thái cho đơn: {} -> {}", event.getTrackingCode(), event.getStatus());

        String title = "Cập nhật trạng thái vận đơn";
        String message = String.format("Đơn hàng %s đã được cập nhật trạng thái: %s tại %s (%s)",
                event.getTrackingCode(), event.getStatus(), event.getLocationCode(), event.getNote());

        NotificationLog noti = NotificationLog.builder()
                .trackingCode(event.getTrackingCode())
                .recipientPhone("SYSTEM_SMS")
                .type("SMS")
                .title(title)
                .message(message)
                .status("SENT")
                .sentAt(LocalDateTime.now())
                .build();

        notificationRepository.save(noti);
        log.info("[NOTIFICATION] Đã lưu thông báo trạng thái mới cho đơn {}", event.getTrackingCode());
    }

    @KafkaListener(topics = "email-events", groupId = "notification-group")
    public void handleSendEmailEvent(SendEmailEvent event) {
        log.info("[NOTIFICATION] Nhận yêu cầu gửi email tới: {} | Loại: {}", event.getToEmail(), event.getType());

        emailService.sendSimpleEmail(event.getToEmail(), event.getSubject(), event.getBody());

        NotificationLog noti = NotificationLog.builder()
                .trackingCode(event.getTrackingCode() != null ? event.getTrackingCode() : "AUTH_OTP")
                .recipientPhone(event.getToEmail())
                .type("EMAIL")
                .title(event.getSubject())
                .message(event.getBody())
                .status("SENT")
                .sentAt(LocalDateTime.now())
                .build();

        notificationRepository.save(noti);
        log.info("[NOTIFICATION] Đã gửi và lưu log email cho đơn {}", event.getToEmail());
    }
}
