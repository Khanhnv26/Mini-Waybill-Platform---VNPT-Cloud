package org.app.trackingservice.consumer;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.app.trackingservice.dto.event.CreateShipmentEvent;
import org.app.trackingservice.dto.event.RouteAssignedEvent;
import org.app.trackingservice.dto.event.ShipmentStatusUpdatedEvent;
import org.app.trackingservice.entity.TrackingHistory;
import org.app.trackingservice.repository.TrackingHistoryRepository;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.kafka.annotation.BackOff;
import org.springframework.kafka.annotation.DltHandler;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.annotation.RetryableTopic;
import org.springframework.kafka.support.KafkaHeaders;
import org.springframework.messaging.handler.annotation.Header;
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

        TrackingHistory history = TrackingHistory.builder()
                .trackingCode(event.getTrackingCode())
                .status("ROUTE_ASSIGNED")
                .locationCode(event.getOriginPostOffice() != null ? event.getOriginPostOffice() : event.getSourceHub())
                .node(nodeText)
                .occurredAt(LocalDateTime.now())
                .build();
        trackingRepository.save(history);

        String redisKey = "shipment-status:" + event.getTrackingCode();
        redisTemplate.opsForValue().set(redisKey,"ROUTE_ASSIGNED", Duration.ofDays(7));
        String loc = event.getOriginPostOffice() != null ? event.getOriginPostOffice() : event.getSourceHub();
        redisTemplate.opsForValue().set("shipment-location:" + event.getTrackingCode(), loc != null ? loc : "", Duration.ofDays(7));

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
        log.info("[TRACKING-SERVICE] Nhận event cập nhật trạng thái từ Routing: trackingCode={}, status={}, locationCode={}, note={}",
                event.getTrackingCode(), event.getStatus(), event.getLocationCode(), event.getNote());

        if (event.getStatus() != null) {
            String status = event.getStatus().trim();
            if ("ARRIVED_DEST_HUB".equals(status) || "IN_TRANSIT".equals(status)) {
                String defaultNode = "ARRIVED_DEST_HUB".equals(status)
                        ? "Đơn hàng đã đến trạm trung chuyển cuối cùng trước khi giao hàng"
                        : "Chuyến xe vận chuyển bưu phẩm đang lưu thông trên tuyến trục";

                String locCode = event.getLocationCode() != null ? event.getLocationCode() : ("ARRIVED_DEST_HUB".equals(status) ? "DEST_HUB" : "TRANSIT_HUB");

                TrackingHistory trackingHistory = TrackingHistory.builder()
                        .trackingCode(event.getTrackingCode())
                        .status(status)
                        .locationCode(locCode)
                        .node(event.getNote() != null ? event.getNote() : defaultNode)
                        .occurredAt(event.getUpdatedAt() != null ? event.getUpdatedAt() : LocalDateTime.now())
                        .build();
                trackingRepository.save(trackingHistory);

                String redisKey = "shipment-status:" + event.getTrackingCode();
                redisTemplate.opsForValue().set(redisKey, status, Duration.ofDays(7));
                redisTemplate.opsForValue().set("shipment-location:" + event.getTrackingCode(), locCode, Duration.ofDays(7));
                log.info("[TRACKING-SERVICE] Đã lưu lịch sử hành trình & cập nhật Redis cho đơn: {} -> {} | loc: {}", event.getTrackingCode(), status, locCode);
            }
        }
    }
}
