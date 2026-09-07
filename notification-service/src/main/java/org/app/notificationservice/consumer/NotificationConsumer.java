package org.app.notificationservice.consumer;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.app.notificationservice.dto.event.CreateShipmentEvent;
import org.app.notificationservice.dto.event.RouteAssignedEvent;
import org.app.notificationservice.dto.event.SendEmailEvent;
import org.app.notificationservice.dto.event.ShipmentStatusUpdatedEvent;
import org.app.notificationservice.entity.NotificationLog;
import org.app.notificationservice.repository.NotificationRepository;
import org.app.notificationservice.service.EmailService;
import org.app.notificationservice.util.EmailTemplateHelper;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Set;

@Slf4j
@RequiredArgsConstructor
@Service
public class NotificationConsumer {

    private final NotificationRepository notificationRepository;
    private final EmailService emailService;
    private final StringRedisTemplate stringRedisTemplate;

    @KafkaListener(topics = "shipment-events", groupId = "notification-group")
    public void handleShipmentCreated(CreateShipmentEvent event) {
        log.info("[NOTIFICATION] Xử lý đơn mới: {}", event.getTrackingCode());
        if (event.getCustomerEmail() != null && !event.getCustomerEmail().isBlank()) {
            String redisKey = "shipment:email:" + event.getTrackingCode();
            stringRedisTemplate.opsForValue().set(redisKey, event.getCustomerEmail(), Duration.ofDays(30));
            log.info("[NOTIFICATION] Đã lưu Redis mapping: {} -> {}", redisKey, event.getCustomerEmail());

            String htmlBody = EmailTemplateHelper.buildShipmentCreatedHtml(
                    event.getSenderName(),
                    event.getTrackingCode(),
                    event.getReceiverName(),
                    "Theo địa chỉ người nhận trên phiếu gửi"
            );

            String subject = "[VNPT Waybill] Tạo đơn hàng thành công - " + event.getTrackingCode();
            emailService.sendHtmlEmail(event.getCustomerEmail(), subject, htmlBody);

            NotificationLog noti = NotificationLog.builder()
                    .trackingCode(event.getTrackingCode())
                    .recipientPhone(event.getCustomerEmail())
                    .type("EMAIL")
                    .title("Thông báo tạo vận đơn")
                    .message("Đơn hàng đã được tạo thành công. Vui lòng kiểm tra email để biết chi tiết.")
                    .status("SENT")
                    .sentAt(LocalDateTime.now())
                    .build();
            notificationRepository.save(noti);
        } else {
            log.warn("[NOTIFICATION] Không có email khách hàng để gửi thông báo cho đơn: {}", event.getTrackingCode());
        }
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
    public void handleStatusUpdatedEvent(ShipmentStatusUpdatedEvent event) {
       String status = event.getStatus();
        log.info("[NOTIFICATION] Nhận event cập nhật trạng thái: {} -> {}", event.getTrackingCode(), status);

        Set<String> notifyStatues = Set.of("OUT_FOR_DELIVERY", "DELIVERED", "DELIVERY_FAILED");
        if (!notifyStatues.contains(status)) {
            log.info("[NOTIFICATION] Bỏ qua gửi email cho trạng thái trung gian: {}", status);
            return;
        }

        String redisKey = "shipment:email:" + event.getTrackingCode();
        String customerEmail = stringRedisTemplate.opsForValue().get(redisKey);
        if (customerEmail != null &&  !customerEmail.isBlank()) {
            String htmlBody = EmailTemplateHelper.buildStatusUpdateHtml(
                    event.getTrackingCode(),
                    event.getStatus(),
                    event.getLocationCode(),
                    event.getNote()
            );

            String subject = "[VNPT Waybill] Cập nhật đơn " + event.getTrackingCode() + " - " + status;
            emailService.sendHtmlEmail(customerEmail, subject, htmlBody);

            NotificationLog noti = NotificationLog.builder()
                    .trackingCode(event.getTrackingCode())
                    .recipientPhone(customerEmail)
                    .type("EMAIL")
                    .title(subject)
                    .message(event.getNote())
                    .status("SENT")
                    .sentAt(LocalDateTime.now())
                    .build();
            notificationRepository.save(noti);
        } else {
            log.warn("[NOTIFICATION] Không tìm thấy email khách hàng cho đơn: {}. Bỏ qua gửi thông báo.", event.getTrackingCode());
        }
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
