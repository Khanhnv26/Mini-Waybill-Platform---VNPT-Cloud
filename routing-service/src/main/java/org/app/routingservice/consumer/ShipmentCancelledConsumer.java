package org.app.routingservice.consumer;


import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.app.routingservice.dto.event.ShipmentStatusUpdatedEvent;
import org.app.routingservice.entity.RoutingAssignment;
import org.app.routingservice.entity.Trip;
import org.app.routingservice.entity.TripManifest;
import org.app.routingservice.entity.WarehouseInventory;
import org.app.routingservice.repository.RoutingAssignmentRepository;
import org.app.routingservice.repository.TripManifestRepository;
import org.app.routingservice.repository.TripRepository;
import org.app.routingservice.repository.WarehouseInventoryRepository;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.kafka.annotation.BackOff;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.annotation.RetryableTopic;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class ShipmentCancelledConsumer {

    private final TripManifestRepository manifestRepository;
    private final TripRepository tripRepository;
    private final RoutingAssignmentRepository routingAssignmentRepository;
    private final WarehouseInventoryRepository inventoryRepository;
    private final StringRedisTemplate redisTemplate;


    @KafkaListener(topics = "tracking-status-events", groupId = "routing-cancel-group")
    @Transactional
    @RetryableTopic(attempts = "3", backOff = @BackOff(delay = 1000, multiplier = 2))
    public void handleCancelledShipmentEvent(ShipmentStatusUpdatedEvent event) {
        if (event == null || event.getTrackingCode() == null || event.getTrackingCode().isBlank()) {
            return;
        }

        String status = event.getStatus() != null ? event.getStatus().trim().toUpperCase() : "";
        if (!"CANCELLED".equals(status) && !"RETURNING".equals(status)) {
            return;
        }

        boolean isReturning = "RETURNING".equals(status);
        String trackingCode = event.getTrackingCode().trim().toUpperCase();

        if (!isReturning) {
            // Chỉ ghi tombstone nếu đơn THỰC SỰ bị hủy vĩnh viễn (CANCELLED)
            String tombstoneKey = "shipment-cancelled:" + trackingCode;
            redisTemplate.opsForValue().set(tombstoneKey, "1", Duration.ofDays(30));
        }

        String processedKey = (isReturning ? "shipment-return-processed:" : "shipment-cancel-processed:") + trackingCode;
        Boolean isFirstTime = redisTemplate.opsForValue().setIfAbsent(
                processedKey, "1", Duration.ofDays(30));
        if (Boolean.FALSE.equals(isFirstTime)) {
            log.info("Sự kiện {} đơn hàng {} đã được xử lý trước đó. Bỏ qua.", status, trackingCode);
            return;
        }

        try {
            LocalDateTime now = LocalDateTime.now();
            Optional<TripManifest> activeManifest = manifestRepository.findByTrackingCode(trackingCode).stream()
                    .filter(manifest -> "LOADED".equalsIgnoreCase(manifest.getStatus())
                            || "HOLD_FOR_RETURN".equalsIgnoreCase(manifest.getStatus()))
                    .findFirst();
            Optional<RoutingAssignment> assignment = routingAssignmentRepository.findByTrackingCode(trackingCode);
            WarehouseInventory inventory = inventoryRepository.findByTrackingCode(trackingCode).orElse(null);

            String targetStatus = isReturning ? "RETURNING" : "CANCELLED";

            if (activeManifest.isPresent()) {
                TripManifest manifest = activeManifest.get();
                Trip trip = tripRepository.findById(manifest.getTripId()).orElse(null);

                if (trip != null && "SCHEDULED".equalsIgnoreCase(trip.getStatus())) {
                    manifest.setStatus("REMOVED");
                    manifest.setUnloadedAt(now);
                    manifestRepository.save(manifest);
                    releaseInventory(inventory, targetStatus, now);
                    assignment.ifPresent(a -> markStatus(a, targetStatus));
                    refreshTripTotals(trip);
                    log.info("[ROUTING-KAFKA] Đã gỡ đơn {} ({}) khỏi chuyến xe {} và cập nhật tồn kho.",
                            trackingCode, targetStatus, trip.getTripCode());
                } else if (trip != null && "IN_TRANSIT".equalsIgnoreCase(trip.getStatus())) {
                    if ("LOADED".equalsIgnoreCase(manifest.getStatus())) {
                        manifest.setStatus("HOLD_FOR_RETURN");
                        manifestRepository.save(manifest);
                    }
                    assignment.ifPresent(a -> markStatus(a, targetStatus));
                    log.warn("[ROUTING-KAFKA] Chuyến xe {} đang chạy; giữ đơn {} tại chuyến để dỡ ở trạm kế tiếp theo luồng {}.",
                            trip.getTripCode(), trackingCode, targetStatus);
                }
            } else {
                assignment.ifPresent(a -> markStatus(a, targetStatus));
                if (inventory != null && inventory.getActiveTripId() == null) {
                    releaseInventory(inventory, targetStatus, now);
                }
                log.info("[ROUTING-KAFKA] Đã ghi nhận {} cho đơn {} dù chưa có manifest đang chạy.", targetStatus, trackingCode);
            }
        } catch (RuntimeException failure) {
            redisTemplate.delete(processedKey);
            throw failure;
        }
    }

    private void markStatus(RoutingAssignment assignment, String targetStatus) {
        assignment.setStatus(targetStatus);
        routingAssignmentRepository.save(assignment);
    }

    private void releaseInventory(WarehouseInventory inventory, String targetStatus, LocalDateTime now) {
        if (inventory == null) return;
        inventory.setInventoryStatus(targetStatus);
        inventory.setActiveTripId(null);
        inventory.setReservedAt(null);
        inventory.setUpdatedAt(now);
        inventoryRepository.save(inventory);
    }

    private void refreshTripTotals(Trip trip) {
        Double updatedWeight = manifestRepository.sumActiveWeightByTripId(trip.getId());
        trip.setCurrentWeight(updatedWeight != null ? updatedWeight : 0.0);
        long activeCount = manifestRepository.findByTripIdAndStatus(trip.getId(), "LOADED").size();
        trip.setTotalShipments((int) activeCount);
        tripRepository.save(trip);
    }
}
