package org.app.shipmentservice.consumer;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.app.sharedevents.entity.OperationType;
import org.app.sharedevents.entity.PaymentSuccessEvent;
import org.app.sharedevents.entity.ShipmentLifecycleEvent;
import org.app.shipmentservice.dto.event.ShipmentStatusUpdatedEvent;
import org.app.shipmentservice.entity.CodSettlementStatus;
import org.app.shipmentservice.entity.Shipment;
import org.app.shipmentservice.entity.ShipmentStatus;
import org.app.shipmentservice.entity.FeePaymentStatus;
import org.app.shipmentservice.entity.ReturnRequest;
import org.app.shipmentservice.repository.ReturnRequestRepository;
import org.app.shipmentservice.repository.ShipmentRepository;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Service
@Slf4j
@RequiredArgsConstructor
public class PaymentSuccessConsumer {

    private final ShipmentRepository shipmentRepository;
    private final ReturnRequestRepository returnRequestRepository;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    @KafkaListener(topics = "payment-success-events", groupId = "shipment-payment-group")
    public void handlePaymentSuccess(PaymentSuccessEvent event) {
        log.info("[SHIPMENT-SERVICE] Nhận event thanh toán thành công: trackingCode={}, amount={}, type={}",
                event.getTrackingCode(), event.getAmount(), event.getPaymentType());

        if (event.getTrackingCode() == null || event.getTrackingCode().isBlank()) {
            return;
        }

        Optional<Shipment> opt = shipmentRepository.findShipmentByTrackingCode(event.getTrackingCode());
        if (opt.isEmpty()) {
            log.warn("[SHIPMENT-SERVICE] Không tìm thấy vận đơn: {}", event.getTrackingCode());
            return;
        }

        Shipment shipment = opt.get();

        if (shipment.getCurrentStatus() == ShipmentStatus.CANCELLED) {
            log.warn("[SHIPMENT-SERVICE] Bỏ qua thanh toán {} cho đơn đã hủy {}",
                    event.getPaymentType(), event.getTrackingCode());
            return;
        }

        if ("COD".equalsIgnoreCase(event.getPaymentType())) {
            LocalDateTime settledAt = event.getPaidAt() != null ? event.getPaidAt() : LocalDateTime.now();
            shipment.setCurrentStatus(ShipmentStatus.DELIVERED);
            shipment.setCodSettlementStatus(CodSettlementStatus.SETTLED);
            shipment.setCodSettledAt(settledAt);
            shipment.setCodSettledBy("VIETQR_GATEWAY");
            shipmentRepository.save(shipment);

            log.info("[SHIPMENT-SERVICE] Đã cập nhật DELIVERED và COD SETTLED cho đơn {}", event.getTrackingCode());

            String location = "CUSTOMER";
            String note = "Bưu tá phát thành công tận nơi và đã thanh toán COD qua VietQR";

            // 1. Đồng bộ qua shipment-lifecycle-events
            ShipmentLifecycleEvent lifecycleEvent = ShipmentLifecycleEvent.builder()
                    .eventId("cod-payment-delivered:" + UUID.randomUUID())
                    .trackingCode(shipment.getTrackingCode())
                    .status("DELIVERED")
                    .operationType(OperationType.DELIVERED)
                    .locationCode(location)
                    .actorId("VIETQR_GATEWAY")
                    .note(note)
                    .occurredAt(settledAt)
                    .build();
            try {
                kafkaTemplate.send("shipment-lifecycle-events", shipment.getTrackingCode(), lifecycleEvent);
            } catch (Exception ex) {
                log.warn("[SHIPMENT-SERVICE] Lỗi gửi lifecycle event DELIVERED: {}", ex.getMessage());
            }

            // 2. Đồng bộ qua tracking-status-events
            ShipmentStatusUpdatedEvent statusEvent = ShipmentStatusUpdatedEvent.builder()
                    .trackingCode(shipment.getTrackingCode())
                    .status("DELIVERED")
                    .codSettlementStatus(CodSettlementStatus.SETTLED.name())
                    .locationCode(location)
                    .note(note)
                    .updateAt(settledAt)
                    .build();
            try {
                kafkaTemplate.send("tracking-status-events", shipment.getTrackingCode(), statusEvent);
            } catch (Exception ex) {
                log.warn("[SHIPMENT-SERVICE] Lỗi gửi tracking-status-events DELIVERED: {}", ex.getMessage());
            }
        } else if ("SHIPPING_FEE".equalsIgnoreCase(event.getPaymentType())) {
            shipmentRepository.save(shipment);
            log.info("[SHIPMENT-SERVICE] Đã ghi nhận thanh toán cước phí vận chuyển thành công cho đơn {}", event.getTrackingCode());
        } else if ("RETURN_FEE".equalsIgnoreCase(event.getPaymentType())) {
            Optional<ReturnRequest> returnOpt = returnRequestRepository.findByTrackingCode(event.getTrackingCode());
            if (returnOpt.isPresent()) {
                ReturnRequest returnRequest = returnOpt.get();
                returnRequest.setFeePaymentStatus(FeePaymentStatus.PREPAID);
                returnRequest.setUpdatedAt(LocalDateTime.now());
                returnRequestRepository.save(returnRequest);
                log.info("[SHIPMENT-SERVICE] Đã cập nhật cước hoàn PREPAID cho đơn {}", event.getTrackingCode());
            } else {
                log.warn("[SHIPMENT-SERVICE] Nhận event RETURN_FEE nhưng chưa có ReturnRequest cho đơn: {}", event.getTrackingCode());
            }
        }
    }
}
