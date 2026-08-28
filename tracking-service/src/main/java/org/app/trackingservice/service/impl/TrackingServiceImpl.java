package org.app.trackingservice.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.app.trackingservice.dto.event.ShipmentStatusUpdatedEvent;
import org.app.trackingservice.dto.request.UpdateStatusRequest;
import org.app.trackingservice.entity.TrackingHistory;
import org.app.trackingservice.repository.TrackingHistoryRepository;
import org.app.trackingservice.service.TrackingService;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class TrackingServiceImpl implements TrackingService {
    private final TrackingHistoryRepository trackingHistoryRepository;
    private final StringRedisTemplate redisTemplate;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    @Override
    public Map<String, String> getCurrentStatus(String trackingCode) {
        String redisKey = "shipment-status:" + trackingCode;
        String cacheStatus = redisTemplate.opsForValue().get(redisKey);

        if (cacheStatus != null) {
            log.info("Cache HIT cho đơn: {} -> Status: {}", trackingCode, cacheStatus);
            return Map.of("trackingCode", trackingCode, "currentStatus", cacheStatus, "source", "REDIS_CACHE");
        }

        log.warn("Cache MISS cho đơn: {}, đang đọc từ SQL Server...", trackingCode);

        TrackingHistory latestHistory = trackingHistoryRepository.findTopByTrackingCodeOrderByOccurredAtDesc(trackingCode).orElse(null);
        if (latestHistory != null) {
            redisTemplate.opsForValue().set(redisKey, latestHistory.getStatus());
            return Map.of("trackingCode", trackingCode, "currentStatus", latestHistory.getStatus(), "source", "SQL_SERVER");
        }

        // Tự động khởi tạo mốc ban đầu nếu là đơn hợp lệ nhưng chưa có log
        TrackingHistory initial = TrackingHistory.builder()
                .trackingCode(trackingCode)
                .status("PENDING_ROUTING")
                .locationCode("WAREHOUSE")
                .node("Đơn hàng đã được khởi tạo và đang chờ phân tuyến")
                .occurredAt(LocalDateTime.now())
                .build();
        trackingHistoryRepository.save(initial);
        redisTemplate.opsForValue().set(redisKey, "PENDING_ROUTING");

        return Map.of("trackingCode", trackingCode, "currentStatus", "PENDING_ROUTING", "source", "AUTO_INITIALIZED");
    }

    @Override
    public List<TrackingHistory> getTrackingHistory(String trackingCode) {
        List<TrackingHistory> list = trackingHistoryRepository.findByTrackingCodeOrderByOccurredAtAsc(trackingCode);
        if (list.isEmpty()) {
            TrackingHistory initial = TrackingHistory.builder()
                    .trackingCode(trackingCode)
                    .status("PENDING_ROUTING")
                    .locationCode("WAREHOUSE")
                    .node("Đơn hàng đã được khởi tạo và đang chờ phân tuyến")
                    .occurredAt(LocalDateTime.now())
                    .build();
            return List.of(trackingHistoryRepository.save(initial));
        }
        return list;
    }

    @Override
    public TrackingHistory updateStatus(String trackingCode, UpdateStatusRequest request) {
        log.info("[TRACKING] Cập nhật trạng thái thủ công cho đơn: {} -> {}", trackingCode, request.getStatus());

        // 1. Lưu timeline vào SQL Server
        TrackingHistory history = TrackingHistory.builder()
                .trackingCode(trackingCode)
                .status(request.getStatus())
                .locationCode(request.getLocationCode() != null ? request.getLocationCode() : "TRANSIT_HUB")
                .node(request.getNote() != null ? request.getNote() : "Cập nhật trạng thái: " + request.getStatus())
                .occurredAt(LocalDateTime.now())
                .build();
        TrackingHistory saved = trackingHistoryRepository.save(history);

        // 2. Cập nhật Redis Cache
        String redisKey = "shipment-status:" + trackingCode;
        redisTemplate.opsForValue().set(redisKey, request.getStatus());
        log.info("[TRACKING] Đã cập nhật Redis Cache cho đơn {} -> {}", trackingCode, request.getStatus());

        // 3. Bắn Event lên Kafka topic 'tracking-status-events'
        ShipmentStatusUpdatedEvent event = ShipmentStatusUpdatedEvent.builder()
                .trackingCode(trackingCode)
                .status(request.getStatus())
                .locationCode(saved.getLocationCode())
                .note(saved.getNode())
                .updatedAt(saved.getOccurredAt())
                .build();
        kafkaTemplate.send("tracking-status-events", trackingCode, event);
        log.info("[TRACKING] Đã bắn event ShipmentStatusUpdatedEvent lên topic 'tracking-status-events'");

        return saved;
    }
}
