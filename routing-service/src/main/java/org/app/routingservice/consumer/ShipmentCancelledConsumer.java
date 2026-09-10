package org.app.routingservice.consumer;


import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.app.routingservice.dto.event.ShipmentStatusUpdatedEvent;
import org.app.routingservice.entity.Trip;
import org.app.routingservice.entity.TripManifest;
import org.app.routingservice.repository.TripManifestRepository;
import org.app.routingservice.repository.TripRepository;
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
    private final StringRedisTemplate redisTemplate;


    @KafkaListener(topics = "tracking-status-events", groupId = "routing-cancel-group")
    @Transactional
    @RetryableTopic(attempts = "3", backOff = @BackOff(delay = 1000, multiplier = 2))
    public void handleCancelledShipmentEvent(ShipmentStatusUpdatedEvent event) {

        if (!"CANCELLED".equalsIgnoreCase(event.getStatus())) {
          return;
        }

        String deuplicateKey = "shipment-cancelled:" + event.getTrackingCode();
        Boolean isFirstTime = redisTemplate.opsForValue().setIfAbsent(deuplicateKey, "1", Duration.ofDays(7));

        if (Boolean.FALSE.equals(isFirstTime)) {
            log.info("Sự kiện hủy đơn hàng {} đã được xử lý trước đó. Bỏ qua.", event.getTrackingCode());
            return;
        }

        Optional<TripManifest> manifestOpt = manifestRepository.findByTrackingCodeAndStatus(event.getTrackingCode(), "LOADED");

        if (manifestOpt.isEmpty()) {
            log.info("[ROUTING-KAFKA] Đơn hàng {} bị hủy nhưng chưa được xếp lên chuyến xe nào. Bỏ qua.", event.getTrackingCode());
            return;
        }

        TripManifest manifest = manifestOpt.get();
        Long tripId = manifest.getTripId();
        Trip trip = tripRepository.findById(tripId).orElseThrow(() -> new IllegalArgumentException("Không tìm thấy chuyến đi với ID: " + tripId));

        if ("SCHEDULED".equals(trip.getStatus())) {
            manifest.setStatus("REMOVED");
            manifest.setUnloadedAt(LocalDateTime.now());
            manifestRepository.save(manifest);

            Double updatedWeight = manifestRepository.sumActiveWeightByTripId(tripId);
            trip.setCurrentWeight(updatedWeight != null ? updatedWeight : 0.0);
            long activeCount = manifestRepository.findByTripIdAndStatus(tripId, "LOADED").size();
            trip.setTotalShipments((int) activeCount);
            tripRepository.save(trip);

            log.info("[ROUTING-KAFKA] Đã tự động gỡ đơn {} khỏi chuyến xe {}. Tải trọng mới: {}/{} kg.",
                    event.getTrackingCode(), trip.getTripCode(), trip.getCurrentWeight(), trip.getMaxWeight());
        } else if ("IN_TRANSIT".equals(trip.getStatus())) {
            manifest.setStatus("HOLD_FOR_RETURN");
            manifestRepository.save(manifest);
            log.warn("[ROUTING-KAFKA] Chuyến xe {} đang chạy! Gắn cờ HOLD_FOR_RETURN cho đơn {} để dỡ tại trạm kế tiếp.",
                    trip.getTripCode(), event.getTrackingCode());
        }
    }
}
