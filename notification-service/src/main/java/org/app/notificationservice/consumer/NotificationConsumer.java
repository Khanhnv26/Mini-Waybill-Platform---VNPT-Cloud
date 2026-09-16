package org.app.notificationservice.consumer;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.app.notificationservice.client.ShipmentClient;
import org.app.notificationservice.client.ShipperClient;
import org.app.notificationservice.dto.event.*;
import org.app.notificationservice.dto.response.ShipmentDetailResponse;
import org.app.notificationservice.dto.response.ShipperLookupResponse;
import org.app.notificationservice.entity.NotificationLog;
import org.app.notificationservice.repository.NotificationRepository;
import org.app.notificationservice.service.EmailService;
import org.app.notificationservice.service.TelegramService;
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
    private final ShipmentClient shipmentClient;
    private final ShipperClient shipperClient;
    private final TelegramService telegramService;

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

        if (status != null && Set.of("DELIVERY_FAILED", "RETURNING").contains(status)) {
            String assignedCourier = stringRedisTemplate.opsForValue().get("shipper:assigned:" + event.getTrackingCode());
            if (assignedCourier != null && !assignedCourier.isBlank()) {
                notifyShipperOnFailure(event.getTrackingCode(), assignedCourier, status, event.getNote());
            } else {
                log.warn("[NOTIFICATION] Không tìm thấy bưu tá được gán cho đơn {} ({}). Bỏ qua Telegram.", event.getTrackingCode(), status);
            }
        }

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

    @KafkaListener(topics = "shipment-lifecycle-events", groupId = "notification-group")
    public void handleShipmentLifeCycle(ShipmentLifecycleEvent event) {
        boolean isHandOff = "HANDED_TO_COURIER".equals(event.getOperationType())
                ||"OUT_FOR_DELIVERY".equals(event.getStatus());

        if (!isHandOff) {
            return;
        }

        String trackingCode = event.getTrackingCode();
        String courierCode = event.getActorId();

        log.info("[NOTIFICATION] Nhận sự kiện bàn giao đơn {} cho bưu tá {}", trackingCode, courierCode);
        if (courierCode == null || courierCode.isBlank()) {
            log.warn("[NOTIFICATION] Không có mã bưu tá trong sự kiện bàn giao đơn {}. Bỏ qua gửi thông báo.", trackingCode);
            return;
        }

        stringRedisTemplate.opsForValue()
                .set("shipper:assigned:" + trackingCode, courierCode, Duration.ofDays(30));

        try {
            ShipperLookupResponse shipper = shipperClient.findByCourierCode(courierCode);
            if(shipper == null || !shipper.isFound() || shipper.getTelegramChatId() == null || shipper.getTelegramChatId().isBlank()) {
                log.warn("[NOTIFICATION] Không tìm thấy thông tin bưu tá hợp lệ cho mã bưu tá {}. Bỏ qua gửi thông báo.", courierCode);
                saveTelegramLog(trackingCode, courierCode, "SKIPPED", "Bưu tá chưa liên kết Telegram Chat ID");
                return;
            }

            ShipmentDetailResponse shipment = null;
            try {
                shipment = shipmentClient.getShipmentByCode(trackingCode);
            } catch (Exception e) {
                log.error("[NOTIFICATION] Lỗi khi tìm kiếm thông tin bưu tá cho mã bưu tá {}: {}", courierCode, e.getMessage());
            }

            String message = buildShipperNotificationHtml(event, shipment, shipper);
            telegramService.sendMessage(shipper.getTelegramChatId(), message);
            saveTelegramLog(trackingCode, shipper.getTelegramChatId(), "SENT", "Đã gửi thông báo đơn hàng cho bưu tá " + courierCode);

        } catch (Exception ex) {
            log.error("[NOTIFICATION] Lỗi xử lý gửi Telegram cho bưu tá {} với đơn {}: {}", courierCode, trackingCode, ex.getMessage(), ex);
            saveTelegramLog(trackingCode, courierCode, "FAILED", ex.getMessage());
        }
    }

    private String buildShipperNotificationHtml(ShipmentLifecycleEvent event,
                                 ShipmentDetailResponse shipment, ShipperLookupResponse shipper) {
        String receiverName = (shipment != null && shipment.
                getReceiverName() != null) ? shipment.getReceiverName() : "Theo phiếu gửi";
        String receiverPhone = (shipment != null && shipment.
                getReceiverPhone() != null) ? shipment.getReceiverPhone() : "Chưa cập nhật";
        String receiverAddress = (shipment != null && shipment.
                getReceiverAddress() != null) ? shipment.getReceiverAddress() : "Theo địa chỉ trên bưu gửi";
        String codText = (shipment != null && shipment.
                getCodAmount() != null)
                ? String.format("%,.0f VNĐ", shipment.
                getCodAmount()) : "0 VNĐ";

        return "<b>BẠN CÓ ĐƠN HÀNG MỚI ĐƯỢC PHÂN CÔNG!</b>\n\n"
                + "<b>Bưu tá:</b> " + shipper.getFullName() + " (" + shipper.getCourierCode() + ")\n"
                + "<b>Mã vận đơn:</b> <code>" + event.
                getTrackingCode() + "</code>\n"
                + "<b>Bưu cục xuất phát:</b> " + (event.
                getLocationCode() != null ? event.getLocationCode() : "N/A") + "\n"
                + "------------------------------------\n"
                + "<b>Người nhận:</b> " + receiverName + "\n"
                + "<b>SĐT:</b> " + receiverPhone + "\n"
                + "<b>Địa chỉ phát:</b> " + receiverAddress +
                "\n"
                + "<b>Tiền thu hộ COD:</b> " + codText + "\n"
                + "<b>Ghi chú:</b> " + (event.getNote() != null
                ? event.getNote() : "Không có") + "\n\n"
                + "⚡ <i>Vui lòng kiểm tra hàng hoá và tiến hành phát đúng quy trình!</i>";
    }

    private void saveTelegramLog(String trackingCode, String recipient, String status, String note) {
        NotificationLog noti = NotificationLog.builder()
                .trackingCode(trackingCode)
                .recipientPhone(recipient)
                .type("TELEGRAM")
                .title("Thông báo bưu tá gán đơn")
                .message(note)
                .status(status)
                .sentAt(LocalDateTime.now())
                .build();
        notificationRepository.save(noti);
    }

    private void notifyShipperOnFailure(String trackingCode, String courierCode, String status, String note) {
        try {
            ShipperLookupResponse shipper = shipperClient.findByCourierCode(courierCode);
            if (shipper == null || !shipper.isFound()) {
                log.warn("[NOTIFICATION] Không tìm thấy hồ sơ bưu tá {} cho đơn {}", courierCode, trackingCode);
                return;
            }
            if (shipper.getTelegramChatId() == null || shipper.getTelegramChatId().isBlank()) {
                log.warn("[NOTIFICATION] Bưu tá {} chưa liên kết Telegram. Bỏ qua đơn {}", courierCode, trackingCode);
                return;
            }

            String message = "DELIVERY_FAILED".equals(status)
                    ? "<b>⚠️ PHÁT THẤT BẠI</b>\n"
                        + "Mã đơn: <code>" + trackingCode + "</code>\n"
                        + (note != null && !note.isBlank() ? "Lý do: " + note + "\n" : "")
                        + "Vui lòng xử lý phát lại hoặc chuyển hoàn."
                    : "<b>🔁 CHUYỂN HOÀN</b>\n"
                        + "Mã đơn: <code>" + trackingCode + "</code>\n"
                        + "Đơn đã tự động chuyển hoàn về người gửi.";

            telegramService.sendMessage(shipper.getTelegramChatId(), message);
            saveTelegramLog(trackingCode, shipper.getTelegramChatId(), "SENT",
                    "Thông báo " + status + " cho bưu tá " + courierCode);
        } catch (Exception e) {
            log.error("[NOTIFICATION] Lỗi gửi Telegram ({}) cho đơn {}: {}", status, trackingCode, e.getMessage());
        }
    }

}
