package org.app.paymentservice.consumer;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.app.paymentservice.dto.event.ShipmentStatusUpdatedEvent;
import org.app.paymentservice.entity.PaymentStatus;
import org.app.paymentservice.entity.PaymentTransaction;
import org.app.paymentservice.repository.PaymentTransactionRepository;
import org.springframework.kafka.annotation.BackOff;
import org.springframework.kafka.annotation.DltHandler;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.annotation.RetryableTopic;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ShipmentCancelledConsumer {

    private final PaymentTransactionRepository paymentTransactionRepository;

    @KafkaListener(topics = "tracking-status-events", groupId = "payment-cancel-group")
    @RetryableTopic(attempts = "3", backOff = @BackOff(delay = 1000, multiplier = 2))
    @Transactional
    public void handleCancelledShipment(ShipmentStatusUpdatedEvent event) {
        if (event == null || event.getTrackingCode() == null || event.getTrackingCode().isBlank()
                || !"CANCELLED".equalsIgnoreCase(event.getStatus())) {
            return;
        }

        String trackingCode = event.getTrackingCode().trim().toUpperCase();
        List<PaymentTransaction> successTxs = paymentTransactionRepository
                .findByTrackingCodeOrderByCreatedAtDesc(trackingCode)
                .stream()
                .filter(tx -> tx.getStatus() == PaymentStatus.SUCCESS)
                .toList();

        if (successTxs.isEmpty()) {
            log.info("[PAYMENT-CANCEL] Đơn {} bị hủy nhưng không có giao dịch SUCCESS cần hoàn.", trackingCode);
            return;
        }

        for (PaymentTransaction tx : successTxs) {
            tx.setStatus(PaymentStatus.CANCELLED);
            paymentTransactionRepository.save(tx);
            log.info("[PAYMENT-CANCEL] Hoàn tiền demo: giao dịch {} của đơn {} -> CANCELLED",
                    tx.getPaymentCode(), trackingCode);
        }
    }

    @DltHandler
    public void handleDlt(ShipmentStatusUpdatedEvent event) {
        log.error("[PAYMENT-CANCEL] Event hủy đơn thất bại sau retry, chuyển DLT và bỏ qua: {}", event);
    }
}
