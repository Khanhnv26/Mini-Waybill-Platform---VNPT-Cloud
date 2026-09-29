package org.app.shipmentservice.consumer;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.app.sharedevents.entity.PaymentSuccessEvent;
import org.app.shipmentservice.entity.CodSettlementStatus;
import org.app.shipmentservice.entity.Shipment;
import org.app.shipmentservice.entity.ShipmentStatus;
import org.app.shipmentservice.repository.ShipmentRepository;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
@Slf4j
@RequiredArgsConstructor
public class PaymentSuccessConsumer {

    private final ShipmentRepository shipmentRepository;

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
            shipment.setCurrentStatus(ShipmentStatus.DELIVERED);
            shipment.setCodSettlementStatus(CodSettlementStatus.SETTLED);
            shipment.setCodSettledAt(event.getPaidAt() != null ? event.getPaidAt() : LocalDateTime.now());
            shipment.setCodSettledBy("VIETQR_GATEWAY");
            shipmentRepository.save(shipment);

            log.info("[SHIPMENT-SERVICE] Đã cập nhật DELIVERED và COD SETTLED cho đơn {}", event.getTrackingCode());
        } else if ("SHIPPING_FEE".equalsIgnoreCase(event.getPaymentType())) {
            shipmentRepository.save(shipment);
            log.info("[SHIPMENT-SERVICE] Đã ghi nhận thanh toán cước phí vận chuyển thành công cho đơn {}", event.getTrackingCode());
        }
    }
}
