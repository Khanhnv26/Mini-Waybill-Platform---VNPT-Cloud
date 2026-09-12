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
        if (event == null || event.getTrackingCode() == null || event.getTrackingCode().isBlank()
                || !"CANCELLED".equalsIgnoreCase(event.getStatus())) {
            return;
        }

        String trackingCode = event.getTrackingCode().trim().toUpperCase();
        // This key is a durable cancellation tombstone. RoutingConsumer checks it
        // so a late shipment-created event cannot recreate a routable assignment.
        String tombstoneKey = "shipment-cancelled:" + trackingCode;
        redisTemplate.opsForValue().set(tombstoneKey, "1", Duration.ofDays(30));

        String processedKey = "shipment-cancel-processed:" + trackingCode;
        Boolean isFirstTime = redisTemplate.opsForValue().setIfAbsent(
                processedKey, "1", Duration.ofDays(30));
        if (Boolean.FALSE.equals(isFirstTime)) {
            log.info("Sự kiện hủy đơn hàng {} đã được xử lý trước đó. Bỏ qua.", trackingCode);
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

            if (activeManifest.isPresent()) {
                TripManifest manifest = activeManifest.get();
                Trip trip = tripRepository.findById(manifest.getTripId()).orElse(null);

                if (trip != null && "SCHEDULED".equalsIgnoreCase(trip.getStatus())) {
                    manifest.setStatus("REMOVED");
                    manifest.setUnloadedAt(now);
                    manifestRepository.save(manifest);
                    releaseCancelledInventory(inventory, now);
                    assignment.ifPresent(this::markCancelled);
                    refreshTripTotals(trip);
                    log.info("[ROUTING-KAFKA] Đã gỡ đơn hủy {} khỏi chuyến xe {} và giải phóng tồn kho.",
                            trackingCode, trip.getTripCode());
                } else if (trip != null && "IN_TRANSIT".equalsIgnoreCase(trip.getStatus())) {
                    // Keep the physical reservation until the vehicle reaches its next stop.
                    // arriveAtStop will unload this manifest into a terminal CANCELLED inventory row.
                    if ("LOADED".equalsIgnoreCase(manifest.getStatus())) {
                        manifest.setStatus("HOLD_FOR_RETURN");
                        manifestRepository.save(manifest);
                    }
                    assignment.ifPresent(this::markCancelled);
                    log.warn("[ROUTING-KAFKA] Chuyến xe {} đang chạy; giữ đơn {} tại chuyến để dỡ ở trạm kế tiếp.",
                            trip.getTripCode(), trackingCode);
                }
            } else {
                // Cancellation can arrive before routing assignment creation or after a leg unload.
                // Persist the terminal state wherever routing already has a record.
                assignment.ifPresent(this::markCancelled);
                if (inventory != null && inventory.getActiveTripId() == null) {
                    releaseCancelledInventory(inventory, now);
                }
                log.info("[ROUTING-KAFKA] Đã ghi nhận hủy đơn {} dù chưa có manifest đang chạy.", trackingCode);
            }
        } catch (RuntimeException failure) {
            // Let RetryableTopic retry the database operation instead of permanently
            // acknowledging an event whose reservation cleanup failed.
            redisTemplate.delete(processedKey);
            throw failure;
        }
    }

    private void markCancelled(RoutingAssignment assignment) {
        assignment.setStatus("CANCELLED");
        routingAssignmentRepository.save(assignment);
    }

    private void releaseCancelledInventory(WarehouseInventory inventory, LocalDateTime now) {
        if (inventory == null) return;
        inventory.setInventoryStatus("CANCELLED");
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
