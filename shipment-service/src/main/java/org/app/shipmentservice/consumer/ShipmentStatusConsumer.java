package org.app.shipmentservice.consumer;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.app.shipmentservice.dto.event.ShipmentStatusUpdatedEvent;
import org.app.shipmentservice.entity.Shipment;
import org.app.shipmentservice.entity.ShipmentStatus;
import org.app.shipmentservice.repository.ShipmentRepository;
import org.springframework.cloud.loadbalancer.annotation.LoadBalancerClient;
import org.springframework.kafka.annotation.BackOff;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.annotation.RetryableTopic;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

@Service
@Slf4j
@RequiredArgsConstructor
public class ShipmentStatusConsumer {

    private final ShipmentRepository shipmentRepository;

    @KafkaListener(topics = "tracking-status-events", groupId = "shipment-group")
    @RetryableTopic(attempts = "3", backOff = @BackOff(delay = 1000, multiplier = 2))
    public void handleShipmentUpdateEvent(ShipmentStatusUpdatedEvent event) {
        log.info("[SHIPMENT-SERVICE] Nhận được event cập nhật trạng thái đơn: trackingCode = {}, status = {}, locationCode = {}, note = {}, updateAt = {}",
                event.getTrackingCode(), event.getStatus(), event.getLocationCode(), event.getNote(), event.getUpdateAt());

        Shipment shipment = shipmentRepository.findShipmentByTrackingCode(event.getTrackingCode())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy shipment với tracking code: " + event.getTrackingCode()));

        ShipmentStatus newStatus;
        try {
            newStatus = ShipmentStatus.valueOf(event.getStatus().trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            log.error("Trạng thái không hợp lệ: {}", event.getStatus());
            return;
        }

        if(shipment.getCurrentStatus() == newStatus) {
            log.info("Trạng thái hiện tại của shipment đã là {}, không cần cập nhật.", newStatus);
            return;
        }

        ShipmentStatus oldStatus = shipment.getCurrentStatus();
        if (oldStatus != null && !oldStatus.canTransitionTo(newStatus)) {
            // Kafka retries and the legacy/lifecycle topics can arrive out of order.
            // Never let an older milestone regress the canonical shipment projection.
            log.warn("[SHIPMENT] Bỏ qua chuyển trạng thái không hợp lệ hoặc đến trễ: {} | {} → {}",
                    event.getTrackingCode(), oldStatus, newStatus);
            return;
        }

        shipment.setCurrentStatus(newStatus);
        shipmentRepository.save(shipment);
        log.info("[SHIPMENT] Đồng bộ thành công: {} | {} → {}",
                event.getTrackingCode(), oldStatus, newStatus);
    }


}
