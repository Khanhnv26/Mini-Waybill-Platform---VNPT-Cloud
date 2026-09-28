package org.app.notificationservice.consumer;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.app.sharedevents.entity.PaymentSuccessEvent;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
@Slf4j
@RequiredArgsConstructor
public class PaymentNotificationConsumer {

    private final SimpMessagingTemplate messagingTemplate;

    @KafkaListener(topics = "payment-success-events", groupId = "notification-payment-group")
    public void handlePaymentSuccess(PaymentSuccessEvent event) {
        log.info("[NOTIFICATION-SERVICE] Nhận event thanh toán thành công: trackingCode={}, amount={}",
                event.getTrackingCode(), event.getAmount());

        messagingTemplate.convertAndSend("/topic/payments/" + event.getTrackingCode(), event);

        Map<String, Object> notificationPayload = Map.of(
                "type", "PAYMENT_SUCCESS",
                "trackingCode", event.getTrackingCode() != null ? event.getTrackingCode() : "",
                "amount", event.getAmount() != null ? event.getAmount() : 0,
                "paymentMethod", event.getPaymentMethod() != null ? event.getPaymentMethod() : "VIETQR",
                "message", "Đơn hàng " + event.getTrackingCode() + " đã thanh toán qua VietQR thành công!"
        );
        messagingTemplate.convertAndSend("/topic/notifications", (Object) notificationPayload);
    }
}
