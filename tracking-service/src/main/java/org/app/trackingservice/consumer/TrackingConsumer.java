package org.app.trackingservice.consumer;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.app.trackingservice.dto.event.CreateShipmentEvent;
import org.app.trackingservice.dto.event.RouteAssignedEvent;
import org.app.trackingservice.dto.event.ShipmentStatusUpdatedEvent;
import org.app.trackingservice.entity.TrackingHistory;
import org.app.trackingservice.repository.TrackingHistoryRepository;
import org.app.sharedevents.entity.OperationType;
import org.app.sharedevents.entity.ShipmentLifecycleEvent;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.kafka.annotation.BackOff;
import org.springframework.kafka.annotation.DltHandler;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.annotation.RetryableTopic;
import org.springframework.kafka.support.KafkaHeaders;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class TrackingConsumer {
    private final TrackingHistoryRepository trackingRepository;
    private final StringRedisTemplate redisTemplate;

    @KafkaListener(topics = "shipment-events", groupId = "tracking-group")
    @RetryableTopic(attempts = "3", backOff = @BackOff(delay = 1000, multiplier = 2))
    public void handleCreateShipmentEvent(CreateShipmentEvent event) {

        log.info("[TRACKING-SERVICE] Nhận event ShipmentCreated: {}", event.getTrackingCode());

        String deuplicateKey = "shipment-created:" + event.getTrackingCode();
        Boolean isFirstTime = redisTemplate.opsForValue().setIfAbsent(deuplicateKey, "1", Duration.ofDays(7));

        if (Boolean.FALSE.equals(isFirstTime)) {
            log.info("[TRACKING-SERVICE] Đã xử lý event ShipmentCreated trước đó: {}", event.getTrackingCode());
            return;
        }

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
    @RetryableTopic(attempts = "3", backOff = @BackOff(delay = 1000, multiplier = 2))
    public void handleRoutAssignedEvent(RouteAssignedEvent event) {
        log.info("[TRACKING-SERVICE] Nhận event RouteAssigned: {}", event.getTrackingCode());
        String deuplicateKey = "route-assigned:" + event.getTrackingCode();

        Boolean isFirstTime = redisTemplate.opsForValue().setIfAbsent(deuplicateKey, "1", Duration.ofDays(7));

        if (Boolean.FALSE.equals(isFirstTime)) {
            log.info("[TRACKING-SERVICE] Đã xử lý event RouteAssigned trước đó: {}", event.getTrackingCode());
            return;
        }

        String nodeText = "Đã phân tuyến vận chuyển: " + event.getRouteCode();
        if (event.getOriginPostOffice() != null && event.getDestPostOffice() != null) {
            nodeText += String.format(" (%s ➔ %s ➔ %s ➔ %s)",
                    event.getOriginPostOffice(), event.getSourceHub(),
                    event.getDestinationHub(), event.getDestPostOffice());
        }

        TrackingHistory existingLifecycle = trackingRepository
                .findTopByTrackingCodeAndStatusOrderByOccurredAtDesc(event.getTrackingCode(), "ROUTE_ASSIGNED")
                .orElse(null);
        if (existingLifecycle != null && (existingLifecycle.getEventId() != null
                || existingLifecycle.getOperationType() == OperationType.ROUTE_ASSIGNED)) {
            log.info("[TRACKING-SERVICE] Lifecycle ROUTE_ASSIGNED đã được lưu trước đó cho {}, bỏ qua legacy row",
                    event.getTrackingCode());
        } else {
            TrackingHistory history = TrackingHistory.builder()
                    .trackingCode(event.getTrackingCode())
                    .status("ROUTE_ASSIGNED")
                    .locationCode(event.getOriginPostOffice() != null ? event.getOriginPostOffice() : event.getSourceHub())
                    .node(nodeText)
                    .occurredAt(LocalDateTime.now())
                    .build();
            trackingRepository.save(history);
        }

        String redisKey = "shipment-status:" + event.getTrackingCode();
        redisTemplate.opsForValue().set(redisKey,"ROUTE_ASSIGNED", Duration.ofDays(7));
        String loc = event.getOriginPostOffice() != null ? event.getOriginPostOffice() : event.getSourceHub();
        redisTemplate.opsForValue().set("shipment-location:" + event.getTrackingCode(), loc != null ? loc : "", Duration.ofDays(7));

    }

    @KafkaListener(topics = "shipment-lifecycle-events", groupId = "tracking-lifecycle-group")
    @RetryableTopic(attempts = "3", backOff = @BackOff(delay = 1000, multiplier = 2))
    public void handleShipmentLifecycleEvent(ShipmentLifecycleEvent event) {
        if (event == null || event.getTrackingCode() == null || event.getTrackingCode().isBlank()) {
            log.warn("[TRACKING-SERVICE] Bỏ qua lifecycle event không hợp lệ: {}", event);
            return;
        }

        if (event.getEventId() != null && trackingRepository.existsByEventId(event.getEventId())) {
            log.info("[TRACKING-SERVICE] Bỏ qua lifecycle event trùng eventId={} cho {}",
                    event.getEventId(), event.getTrackingCode());
            return;
        }

        String trackingCode = event.getTrackingCode();
        String status = event.getStatus() != null ? event.getStatus().trim().toUpperCase() : "IN_TRANSIT";
        String locationCode = event.getLocationCode() != null ? event.getLocationCode() : "TRANSIT_HUB";
        LocalDateTime occurredAt = event.getOccurredAt() != null ? event.getOccurredAt() : LocalDateTime.now();
        OperationType operationType = event.getOperationType();

        // route-assigned được phát đồng thời qua topic legacy. Làm giàu bản ghi cũ
        // thay vì tạo thêm một mốc ROUTE_ASSIGNED trùng trong giai đoạn migration.
        TrackingHistory history = operationType == OperationType.ROUTE_ASSIGNED
                ? trackingRepository.findTopByTrackingCodeAndStatusOrderByOccurredAtDesc(trackingCode, status)
                .orElse(null)
                : null;

        if (history == null) {
            history = TrackingHistory.builder()
                    .trackingCode(trackingCode)
                    .status(status)
                    .locationCode(locationCode)
                    .node(event.getNote() != null ? event.getNote() : operationType != null ? operationType.name() : status)
                    .occurredAt(occurredAt)
                    .build();
        } else {
            history.setLocationCode(locationCode);
            if (event.getNote() != null && !event.getNote().isBlank()) {
                history.setNode(event.getNote());
            }
            history.setOccurredAt(occurredAt);
        }

        history.setEventId(event.getEventId());
        history.setOperationType(operationType);
        history.setTransportLeg(event.getTransportLeg());
        history.setTripCode(event.getTripCode());
        history.setActorId(event.getActorId());
        trackingRepository.save(history);

        updateRedisProjection(trackingCode, status, locationCode, occurredAt);
        log.info("[TRACKING-SERVICE] Đã lưu lifecycle {} cho {} tại {}",
                operationType != null ? operationType : status, trackingCode, locationCode);
    }

    private void updateRedisProjection(String trackingCode, String status, String locationCode, LocalDateTime occurredAt) {
        TrackingHistory latest = trackingRepository.findTopByTrackingCodeOrderByOccurredAtDesc(trackingCode).orElse(null);
        if (latest != null && latest.getOccurredAt() != null && latest.getOccurredAt().isAfter(occurredAt)) {
            return;
        }
        Duration ttl = Duration.ofDays(7);
        redisTemplate.opsForValue().set("shipment-status:" + trackingCode, status, ttl);
        redisTemplate.opsForValue().set("shipment-location:" + trackingCode,
                locationCode != null ? locationCode : "", ttl);
    }

    @DltHandler
    public void handleDlt(Object payload,
                          @Header(KafkaHeaders.RECEIVED_TOPIC) String topic,
                          @Header(KafkaHeaders.OFFSET) long offset){
        log.error("[TRACKING-SERVICE] Event trên topic {} offset {} đã thất bại sau các lần thử. Đã chuyển vào DLT: {}", topic, offset, payload);
    }

    @KafkaListener(topics = "tracking-status-events", groupId = "tracking-status-sync-group")
    @RetryableTopic(attempts = "3", backOff = @BackOff(delay = 1000, multiplier = 2))
    public void handleStatusUpdatedFromRouting(ShipmentStatusUpdatedEvent event) {
        if (event == null || event.getTrackingCode() == null || event.getTrackingCode().isBlank()) {
            log.warn("[TRACKING-SERVICE] Bỏ qua legacy status event không có trackingCode: {}", event);
            return;
        }

        String trackingCode = event.getTrackingCode().trim().toUpperCase(Locale.ROOT);
        String status = event.getStatus() != null
                ? event.getStatus().trim().toUpperCase(Locale.ROOT) : "";
        if (!Set.of("ARRIVED_DEST_HUB", "IN_TRANSIT").contains(status)) {
            return;
        }

        String defaultNode = "ARRIVED_DEST_HUB".equals(status)
                ? "Đơn hàng đã đến trạm trung chuyển cuối cùng trước khi giao hàng"
                : "Chuyến xe vận chuyển bưu phẩm đang lưu thông trên tuyến trục";
        String locCode = event.getLocationCode() != null && !event.getLocationCode().isBlank()
                ? event.getLocationCode().trim().toUpperCase(Locale.ROOT)
                : ("ARRIVED_DEST_HUB".equals(status) ? "DEST_HUB" : "TRANSIT_HUB");
        String node = event.getNote() != null && !event.getNote().isBlank() ? event.getNote() : defaultNode;
        LocalDateTime occurredAt = event.getUpdatedAt() != null ? event.getUpdatedAt() : LocalDateTime.now();

        // Legacy events do not carry an event id. Derive one from their immutable
        // payload so Kafka redelivery does not create duplicate history rows.
        String legacyEventId = "legacy-status:" + UUID.nameUUIDFromBytes(
                (trackingCode + "|" + status + "|" + locCode + "|" + node + "|" + occurredAt)
                        .getBytes(StandardCharsets.UTF_8));
        if (trackingRepository.existsByEventId(legacyEventId)) {
            log.info("[TRACKING-SERVICE] Bỏ qua legacy event trùng: {}", legacyEventId);
            return;
        }

        TrackingHistory latest = trackingRepository.findTopByTrackingCodeOrderByOccurredAtDesc(trackingCode)
                .orElse(null);
        if (latest != null) {
            String latestStatus = latest.getStatus() != null
                    ? latest.getStatus().trim().toUpperCase(Locale.ROOT) : "";
            if (Set.of("DELIVERED", "RETURNED", "CANCELLED").contains(latestStatus)) {
                log.info("[TRACKING-SERVICE] Bỏ qua legacy event sau trạng thái kết thúc {} cho {}",
                        latestStatus, trackingCode);
                return;
            }
            if (latest.getOccurredAt() != null && latest.getOccurredAt().isAfter(occurredAt)) {
                log.info("[TRACKING-SERVICE] Bỏ qua legacy event đến trễ cho {}: {} < {}",
                        trackingCode, occurredAt, latest.getOccurredAt());
                return;
            }
            if (latest.getOccurredAt() != null && latest.getOccurredAt().equals(occurredAt)
                    && status.equalsIgnoreCase(latest.getStatus())
                    && locCode.equalsIgnoreCase(latest.getLocationCode())) {
                return;
            }
        }

        TrackingHistory trackingHistory = TrackingHistory.builder()
                .trackingCode(trackingCode)
                .status(status)
                .locationCode(locCode)
                .node(node)
                .occurredAt(occurredAt)
                .eventId(legacyEventId)
                .build();
        trackingRepository.save(trackingHistory);

        // updateRedisProjection rechecks SQL ordering, so an older legacy event
        // cannot overwrite a newer lifecycle projection.
        updateRedisProjection(trackingCode, status, locCode, occurredAt);
        log.info("[TRACKING-SERVICE] Đã lưu legacy hành trình cho đơn: {} -> {} | loc: {}",
                trackingCode, status, locCode);
    }
}
