package org.app.shipmentservice.consumer;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.app.shipmentservice.dto.event.ShipmentStatusUpdatedEvent;
import org.app.shipmentservice.entity.Shipment;
import org.app.shipmentservice.entity.ShipmentStatus;
import org.app.shipmentservice.repository.ShipmentRepository;
import org.app.shipmentservice.service.EtaRecalculationService;
import org.springframework.cloud.loadbalancer.annotation.LoadBalancerClient;
import org.springframework.kafka.annotation.BackOff;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.annotation.RetryableTopic;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.util.Set;

@Service
@Slf4j
@RequiredArgsConstructor
public class ShipmentStatusConsumer {

    private static final Set<ShipmentStatus> ETA_SENSITIVE_STATUSES = Set.of(
            ShipmentStatus.PICKED_UP,
            ShipmentStatus.IN_TRANSIT,
            ShipmentStatus.ARRIVED_DEST_HUB,
            ShipmentStatus.OUT_FOR_DELIVERY);

    private final ShipmentRepository shipmentRepository;
    private final EtaRecalculationService etaRecalculationService;
    private final org.app.shipmentservice.repository.ReturnRequestRepository returnRequestRepository;
    private final org.app.shipmentservice.repository.DeliveryFailureDecisionRepository failureDecisionRepository;
    private final org.app.shipmentservice.service.ReturnFeeCalculator returnFeeCalculator;

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

        // Xử lý các sự kiện nghiệp vụ phát sinh khi trạng thái thay đổi
        if (newStatus == ShipmentStatus.DELIVERY_FAILED) {
            handleDeliveryFailedMilestone(shipment, event);
        } else if (newStatus == ShipmentStatus.RETURNING) {
            handleReturningMilestone(shipment, event);
        } else if (newStatus == ShipmentStatus.RETURNED) {
            handleReturnedMilestone(shipment);
        }

        if (ETA_SENSITIVE_STATUSES.contains(newStatus)) {
            try {
                etaRecalculationService.recalculateByTrackingCode(event.getTrackingCode());
            } catch (Exception e) {
                log.warn("[SHIPMENT] Không tính lại được ETA cho đơn {}: {}", event.getTrackingCode(), e.getMessage());
            }
        }
    }

    private void handleDeliveryFailedMilestone(Shipment shipment, ShipmentStatusUpdatedEvent event) {
        var existing = failureDecisionRepository.findByTrackingCodeOrderByAttemptNoDesc(shipment.getTrackingCode());
        int attemptNo = existing.isEmpty() ? 1 : existing.get(0).getAttemptNo() + 1;

        if (attemptNo <= 2) {
            org.app.shipmentservice.entity.DeliveryFailureDecision decision = org.app.shipmentservice.entity.DeliveryFailureDecision.builder()
                    .trackingCode(shipment.getTrackingCode())
                    .customerId(shipment.getCustomerId())
                    .attemptNo(attemptNo)
                    .failedAt(java.time.LocalDateTime.now())
                    .decisionDeadline(java.time.LocalDateTime.now().plusHours(24))
                    .failureReason(event.getNote() != null ? event.getNote() : "Phát không thành công lần " + attemptNo)
                    .decision(org.app.shipmentservice.entity.FailureDecisionType.PENDING)
                    .createdAt(java.time.LocalDateTime.now())
                    .updatedAt(java.time.LocalDateTime.now())
                    .build();
            failureDecisionRepository.save(decision);
            log.info("[SHIPMENT] Đã tạo DeliveryFailureDecision lần {} cho đơn {}, hạn chót 24h: {}",
                    attemptNo, shipment.getTrackingCode(), decision.getDecisionDeadline());
        } else {
            // Lần 3 tự động chuyển hoàn
            if (!returnRequestRepository.existsByTrackingCodeAndStatusNot(shipment.getTrackingCode(), org.app.shipmentservice.entity.ReturnRequestStatus.REJECTED)) {
                java.math.BigDecimal fee = returnFeeCalculator.calculateReturnFee(shipment, false);
                org.app.shipmentservice.entity.ReturnRequest autoReq = org.app.shipmentservice.entity.ReturnRequest.builder()
                        .trackingCode(shipment.getTrackingCode())
                        .customerId(shipment.getCustomerId())
                        .initiator(org.app.shipmentservice.entity.ReturnInitiator.AUTO_MAX_FAILED)
                        .reasonCode("AUTO_MAX_FAILED_3_TIMES")
                        .reasonNote("Giao thất bại lần 3 - Hệ thống tự động kích hoạt chuyển hoàn")
                        .returnMode(org.app.shipmentservice.entity.ReturnMode.DOORSTEP)
                        .status(org.app.shipmentservice.entity.ReturnRequestStatus.APPROVED)
                        .postalFault(false)
                        .returnFee(fee)
                        .feePaymentStatus(org.app.shipmentservice.entity.FeePaymentStatus.UNPAID)
                        .requestedBy("SYSTEM_AUTO")
                        .createdAt(java.time.LocalDateTime.now())
                        .updatedAt(java.time.LocalDateTime.now())
                        .build();
                returnRequestRepository.save(autoReq);
                log.info("[SHIPMENT] Đã tạo tự động ReturnRequest cho đơn {} do thất bại 3 lần", shipment.getTrackingCode());
            }
        }
    }

    private void handleReturningMilestone(Shipment shipment, ShipmentStatusUpdatedEvent event) {
        if (!returnRequestRepository.existsByTrackingCodeAndStatusNot(shipment.getTrackingCode(), org.app.shipmentservice.entity.ReturnRequestStatus.REJECTED)) {
            boolean receiverRefused = event.getNote() != null
                    && (event.getNote().contains("TU_CHOI_NHAN") || event.getNote().toLowerCase().contains("từ chối"));
            org.app.shipmentservice.entity.ReturnInitiator initiator = receiverRefused
                    ? org.app.shipmentservice.entity.ReturnInitiator.RECEIVER_REFUSED
                    : org.app.shipmentservice.entity.ReturnInitiator.STAFF;
            java.math.BigDecimal fee = returnFeeCalculator.calculateReturnFee(shipment, false);

            org.app.shipmentservice.entity.ReturnRequest req = org.app.shipmentservice.entity.ReturnRequest.builder()
                    .trackingCode(shipment.getTrackingCode())
                    .customerId(shipment.getCustomerId())
                    .initiator(initiator)
                    .reasonCode(receiverRefused ? "TU_CHOI_NHAN" : "STAFF_RETURN")
                    .reasonNote(event.getNote())
                    .returnMode(org.app.shipmentservice.entity.ReturnMode.DOORSTEP)
                    .status(org.app.shipmentservice.entity.ReturnRequestStatus.APPROVED)
                    .postalFault(false)
                    .returnFee(fee)
                    .feePaymentStatus(org.app.shipmentservice.entity.FeePaymentStatus.UNPAID)
                    .requestedBy("SYSTEM_EVENT")
                    .createdAt(java.time.LocalDateTime.now())
                    .updatedAt(java.time.LocalDateTime.now())
                    .build();
            returnRequestRepository.save(req);
            log.info("[SHIPMENT] Đã ghi nhận ReturnRequest cho đơn {} từ sự kiện RETURNING", shipment.getTrackingCode());
        }
    }

    private void handleReturnedMilestone(Shipment shipment) {
        returnRequestRepository.findByTrackingCode(shipment.getTrackingCode()).ifPresent(req -> {
            req.setStatus(org.app.shipmentservice.entity.ReturnRequestStatus.COMPLETED);
            returnRequestRepository.save(req);
            log.info("[SHIPMENT] Đã cập nhật ReturnRequest đơn {} sang COMPLETED", shipment.getTrackingCode());
        });
    }


}
