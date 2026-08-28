package org.app.trackingservice.consumer;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.app.trackingservice.dto.event.CreateShipmentEvent;
import org.app.trackingservice.dto.event.RouteAssignedEvent;
import org.app.trackingservice.entity.TrackingHistory;
import org.app.trackingservice.repository.TrackingHistoryRepository;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class TrackingConsumer {
    private final TrackingHistoryRepository trackingRepository;
    private final StringRedisTemplate redisTemplate;

    @KafkaListener(topics = "shipment-events", groupId = "tracking-group")
    public void handleCreateShipmentEvent(CreateShipmentEvent event) {

        log.info("[TRACKING-SERVICE] Nhận event ShipmentCreated: {}", event.getTrackingCode());
        TrackingHistory history = TrackingHistory.builder()
                .trackingCode(event.getTrackingCode())
                .status("PENDING_ROUTING")
                .locationCode("WAREHOUSE")
                .node("Đơn hàng đã được khởi tạo và đang chờ phân tuyến")
                .occurredAt(LocalDateTime.now())
                .build();
        trackingRepository.save(history);

        String redisKey = "shipment-status:" + event.getTrackingCode();
        redisTemplate.opsForValue().set(redisKey,"PENDING_ROUTING", Duration.ofDays(7));
    }

    @KafkaListener(topics = "route-assigned", groupId = "tracking-group")
    public void handleRoutAssignedEvent(RouteAssignedEvent event) {
        log.info("[TRACKING-SERVICE] Nhận event RouteAssigned: {}", event.getTrackingCode());

        TrackingHistory history = TrackingHistory.builder()
                .trackingCode(event.getTrackingCode())
                .status("ROUTE_ASSIGNED")
                .locationCode(event.getSourceHub())
                .node("Đã phân tuyến vận chuyển: " + event.getRouteCode())
                .occurredAt(LocalDateTime.now())
                .build();
        trackingRepository.save(history);

        String redisKey = "shipment-status:" + event.getTrackingCode();
        redisTemplate.opsForValue().set(redisKey,"ROUTE_ASSIGNED", Duration.ofDays(7));

    }
}
