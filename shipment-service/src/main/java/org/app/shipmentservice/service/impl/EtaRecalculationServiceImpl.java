package org.app.shipmentservice.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.app.shipmentservice.client.RoutingClient;
import org.app.shipmentservice.dto.request.EtaCalculationRequest;
import org.app.shipmentservice.dto.response.EtaCalculationResponse;
import org.app.shipmentservice.entity.Shipment;
import org.app.shipmentservice.entity.ShipmentStatus;
import org.app.shipmentservice.repository.ShipmentRepository;
import org.app.shipmentservice.service.EtaRecalculationService;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class EtaRecalculationServiceImpl implements EtaRecalculationService {

    private static final Set<ShipmentStatus> TERMINAL_STATUSES = Set.of(
            ShipmentStatus.DELIVERED, ShipmentStatus.RETURNED, ShipmentStatus.CANCELLED);

    private final ShipmentRepository shipmentRepository;
    private final RoutingClient routingClient;

    @Override
    @Transactional
    public Shipment recalculateByTrackingCode(String trackingCode) {
        if (trackingCode == null || trackingCode.isBlank()) {
            return null;
        }
        Shipment shipment = shipmentRepository.findShipmentByTrackingCode(trackingCode).orElse(null);
        if (shipment == null) {
            log.warn("[ETA-RECALC] Không tìm thấy vận đơn {}.", trackingCode);
            return null;
        }
        if (TERMINAL_STATUSES.contains(shipment.getCurrentStatus())) {
            log.debug("[ETA-RECALC] Bỏ qua vận đơn {} vì đã kết thúc ({}).", trackingCode, shipment.getCurrentStatus());
            return shipment;
        }
        return recalculate(shipment);
    }

    @Override
    public int recalculateActiveShipments(int batchSize) {
        int size = batchSize > 0 ? batchSize : 50;
        List<Shipment> activeShipments = shipmentRepository.findByCurrentStatusNotIn(
                List.copyOf(TERMINAL_STATUSES), PageRequest.of(0, size));
        int updated = 0;
        for (Shipment shipment : activeShipments) {
            try {
                Shipment result = recalculate(shipment);
                if (result != null) {
                    updated++;
                }
            } catch (Exception e) {
                log.error("[ETA-RECALC] Lỗi tính lại ETA cho vận đơn {}: {}", shipment.getTrackingCode(), e.getMessage());
            }
        }
        return updated;
    }

    private Shipment recalculate(Shipment shipment) {
        EtaCalculationRequest request = EtaCalculationRequest.builder()
                .senderAddress(shipment.getSenderAddress())
                .receiverAddress(shipment.getReceiverAddress())
                .weight(shipment.getWeight())
                .serviceType(shipment.getServiceType() != null ? shipment.getServiceType().name() : "STANDARD")
                .createdAt(LocalDateTime.now())
                .trackingCode(shipment.getTrackingCode())
                .currentStatus(shipment.getCurrentStatus() != null ? shipment.getCurrentStatus().name() : null)
                .assignedTripCode(shipment.getAssignedTripCode())
                .milestoneAt(LocalDateTime.now())
                .build();

        try {
            EtaCalculationResponse etaRes = routingClient.calculateEta(request);
            if (etaRes == null) {
                return shipment;
            }

            LocalDateTime newEtaAt = etaRes.getEstimatedDeliveryTime();
            LocalDateTime newEtaMax = etaRes.getEstimatedDeliveryMax();
            boolean changed = false;

            if (newEtaAt != null && !newEtaAt.equals(shipment.getEstimatedDeliveryAt())) {
                shipment.setEstimatedDeliveryAt(newEtaAt);
                changed = true;
            }
            if (newEtaMax != null && !newEtaMax.equals(shipment.getEstimatedDeliveryMax())) {
                shipment.setEstimatedDeliveryMax(newEtaMax);
                changed = true;
            }
            if (etaRes.getAssignedTripCode() != null && !etaRes.getAssignedTripCode().equals(shipment.getAssignedTripCode())) {
                shipment.setAssignedTripCode(etaRes.getAssignedTripCode());
                changed = true;
            }

            if (changed) {
                shipmentRepository.save(shipment);
                log.info("[ETA-RECALC] Cập nhật ETA vận đơn {}: {} (tối đa {})",
                        shipment.getTrackingCode(), shipment.getEstimatedDeliveryAt(), shipment.getEstimatedDeliveryMax());
            }
            return shipment;
        } catch (Exception e) {
            log.warn("[ETA-RECALC] Không tính lại được ETA cho vận đơn {}: {}", shipment.getTrackingCode(), e.getMessage());
            return shipment;
        }
    }
}
