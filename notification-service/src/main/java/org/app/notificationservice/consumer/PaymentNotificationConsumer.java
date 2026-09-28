package org.app.notificationservice.consumer;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.app.notificationservice.entity.NotificationLog;
import org.app.notificationservice.repository.NotificationRepository;
import org.app.sharedevents.entity.PaymentSuccessEvent;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.text.NumberFormat;
import java.time.LocalDateTime;
import java.util.Locale;
import java.util.Map;

@Service
@Slf4j
@RequiredArgsConstructor
public class PaymentNotificationConsumer {

    private final SimpMessagingTemplate messagingTemplate;
    private final NotificationRepository notificationRepository;

    @KafkaListener(topics = "payment-success-events", groupId = "notification-payment-group")
    public void handlePaymentSuccess(PaymentSuccessEvent event) {
        log.info("[NOTIFICATION-SERVICE] Nhận event thanh toán thành công: trackingCode={}, amount={}",
                event.getTrackingCode(), event.getAmount());

        messagingTemplate.convertAndSend("/topic/payments/" + event.getTrackingCode(), event);

        String paymentType = event.getPaymentType() != null ? event.getPaymentType().trim().toUpperCase() : "SHIPPING_FEE";
        boolean isShippingFee = "SHIPPING_FEE".equals(paymentType);

        String title = isShippingFee ? "Thanh toán cước vận đơn thành công" : "Thanh toán COD thành công";

        BigDecimal amount = event.getAmount() != null ? event.getAmount() : BigDecimal.ZERO;
        String formattedAmount = NumberFormat.getNumberInstance(Locale.forLanguageTag("vi-VN")).format(amount) + " đ";

        String trackingCode = event.getTrackingCode() != null ? event.getTrackingCode().trim() : "";
        String method = event.getPaymentMethod() != null ? event.getPaymentMethod().trim() : "VietQR";
        String payCode = event.getPaymentCode() != null ? event.getPaymentCode() : "";

        String message = String.format("Vận đơn %s đã thanh toán %s thành công qua %s với số tiền %s. Mã GD: %s",
                trackingCode,
                isShippingFee ? "cước phí" : "tiền thu hộ COD",
                method,
                formattedAmount,
                payCode);

        NotificationLog noti = NotificationLog.builder()
                .trackingCode(trackingCode)
                .recipientPhone("SYSTEM_ALERT")
                .type("IN_APP")
                .title(title)
                .message(message)
                .status("SENT")
                .sentAt(event.getPaidAt() != null ? event.getPaidAt() : LocalDateTime.now())
                .isRead(false)
                .build();

        notificationRepository.save(noti);

        publishBellRefresh();

        Map<String, Object> notificationPayload = Map.of(
                "type", "PAYMENT_SUCCESS",
                "trackingCode", trackingCode,
                "amount", amount,
                "paymentMethod", method,
                "title", title,
                "message", message
        );
        messagingTemplate.convertAndSend("/topic/notifications", (Object) notificationPayload);
    }

    private void publishBellRefresh() {
        try {
            messagingTemplate.convertAndSend("/topic/notifications/broadcast", "refresh");
        } catch (Exception ex) {
            log.warn("[NOTIFICATION] Không đẩy được tín hiệu chuông broadcast: {}", ex.getMessage());
        }
    }
}
