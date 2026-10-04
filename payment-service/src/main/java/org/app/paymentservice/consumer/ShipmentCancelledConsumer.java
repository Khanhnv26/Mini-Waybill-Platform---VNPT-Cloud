package org.app.paymentservice.consumer;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.app.paymentservice.dto.event.ShipmentStatusUpdatedEvent;
import org.app.paymentservice.entity.PaymentStatus;
import org.app.paymentservice.entity.PaymentTransaction;
import org.app.paymentservice.repository.PaymentTransactionRepository;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.kafka.annotation.BackOff;
import org.springframework.kafka.annotation.DltHandler;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.annotation.RetryableTopic;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ShipmentCancelledConsumer {

    private final PaymentTransactionRepository paymentTransactionRepository;
    private final StringRedisTemplate redisTemplate;

    @KafkaListener(topics = "tracking-status-events", groupId = "payment-cancel-group")
    @RetryableTopic(attempts = "3", backOff = @BackOff(delay = 1000, multiplier = 2))
    @Transactional
    public void handleCancelledShipment(ShipmentStatusUpdatedEvent event) {
        if (event == null || event.getTrackingCode() == null || event.getTrackingCode().isBlank()
                || !"CANCELLED".equalsIgnoreCase(event.getStatus())) {
            return;
        }

        String trackingCode = event.getTrackingCode().trim().toUpperCase();

        try {
            redisTemplate.opsForValue().set("shipment-cancelled:" + trackingCode, "1", Duration.ofDays(30));
        } catch (Exception e) {
            log.warn("[PAYMENT-CANCEL] Lỗi ghi nhận Redis tombstone cho đơn {}: {}", trackingCode, e.getMessage());
        }

        List<PaymentTransaction> allTxs = paymentTransactionRepository
                .findByTrackingCodeOrderByCreatedAtDesc(trackingCode);

        if (allTxs.isEmpty()) {
            log.info("[PAYMENT-CANCEL] Đơn {} bị hủy nhưng chưa có giao dịch nào được tạo.", trackingCode);
            return;
        }

        for (PaymentTransaction tx : allTxs) {
            if (tx.getStatus() == PaymentStatus.PENDING) {
                tx.setStatus(PaymentStatus.CANCELLED);
                paymentTransactionRepository.save(tx);
                log.info("[PAYMENT-CANCEL] Hủy bỏ giao dịch PENDING: mã {} của đơn {} do đơn hàng bị hủy",
                        tx.getPaymentCode(), trackingCode);
            } else if (tx.getStatus() == PaymentStatus.SUCCESS) {
                tx.setStatus(PaymentStatus.CANCELLED);
                paymentTransactionRepository.save(tx);
                log.info("[PAYMENT-CANCEL] Hoàn tiền demo: giao dịch SUCCESS {} của đơn {} -> CANCELLED",
                        tx.getPaymentCode(), trackingCode);
            }
        }
    }

    @DltHandler
    public void handleDlt(ShipmentStatusUpdatedEvent event) {
        log.error("[PAYMENT-CANCEL] Event hủy đơn thất bại sau retry, chuyển DLT và bỏ qua: {}", event);
    }
}
