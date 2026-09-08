package org.app.trackingservice.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.app.trackingservice.dto.event.ShipmentStatusUpdatedEvent;
import org.app.trackingservice.dto.request.UpdateStatusRequest;
import org.app.trackingservice.entity.ShipmentStatus;
import org.app.trackingservice.entity.TrackingHistory;
import org.app.trackingservice.exception.ForbiddenException;
import org.app.trackingservice.exception.InvalidStateTransitionException;
import org.app.trackingservice.exception.ShipmentNotFoundException;
import org.app.trackingservice.repository.TrackingHistoryRepository;
import org.app.trackingservice.service.TrackingService;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;

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

        throw new ShipmentNotFoundException(trackingCode);
    }

    @Override
    public List<TrackingHistory> getTrackingHistory(String trackingCode) {
        List<TrackingHistory> list = trackingHistoryRepository.findByTrackingCodeOrderByOccurredAtAsc(trackingCode);
        if (list.isEmpty()) {
            throw new ShipmentNotFoundException(trackingCode);
        }
        return list;
    }

    @Override
    public TrackingHistory updateStatus(String trackingCode, UpdateStatusRequest request, String roles, String permission) {
        log.info("[TRACKING] Cập nhật trạng thái cho đơn: {} -> {} | Roles: {}", trackingCode, request.getStatus(), roles);

        //validate trang thai
        ShipmentStatus newStatus;
        try {
            newStatus = ShipmentStatus.valueOf(request.getStatus().trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new RuntimeException("Trạng thái mới không hợp lệ: " + request.getStatus());
        }

        //check quyen
        boolean isAdminOrCS = roles != null && (roles.contains("ADMIN") || roles.contains("CS"));
        boolean isHubStaff = roles != null && roles.contains("ROLE_HUB_OPERATOR");
        boolean isShipper = roles != null && roles.contains("ROLE_SHIPPER");
        boolean isCustomer = roles != null && roles.contains("ROLE_CUSTOMER") && !isAdminOrCS && !isHubStaff && !isShipper;


        if(isCustomer) {
            throw new ForbiddenException("Khách hàng không có quyền cập nhật trạng thái đơn hàng.");
        }

        if(!isAdminOrCS) {
            if(isHubStaff && !Set.of(ShipmentStatus.PICKED_UP, ShipmentStatus.IN_TRANSIT).contains(newStatus)) {
                throw new ForbiddenException("Nhân viên Hub chỉ có quyền quét tiếp nhận hoặc xuất chuyến !");
            }

            if(isShipper && !Set.of(ShipmentStatus.OUT_FOR_DELIVERY,ShipmentStatus.DELIVERED, ShipmentStatus.DELIVERY_FAILED).contains(newStatus)) {
                throw new ForbiddenException("Bưu tá chỉ có quyền cập nhật trạng thái giao hàng !");
            }
        }

        //kiem tra trang thai hien tai
        Map<String, String> currentStatusJSON = getCurrentStatus(trackingCode);
        String currentStatusStr = currentStatusJSON.get("currentStatus");
        ShipmentStatus currentStatus = ShipmentStatus.valueOf(currentStatusStr);

        if(!currentStatus.canTransitionTo(newStatus)) {
            throw new InvalidStateTransitionException(currentStatus, newStatus);
        }

        //chan phat thai bai qua 3 lan se tra ve cho khach hang
        if (newStatus == ShipmentStatus.DELIVERY_FAILED) {
            long failedCount = trackingHistoryRepository.countByTrackingCodeAndStatus(trackingCode, ShipmentStatus.DELIVERY_FAILED.name());

            if (failedCount >= 3) {
                newStatus = ShipmentStatus.RETURNING;
                request.setStatus(ShipmentStatus.RETURNING.name());
                request.setNote("Giao thất bại lần 3 - Hệ thống tự động chuyển hoàn về người gửi");
            }
        }

        TrackingHistory history = TrackingHistory.builder()
                .trackingCode(trackingCode)
                .status(newStatus.name())
                .locationCode(request.getLocationCode() != null ? request.getLocationCode() : "TRANSIT_HUB")
                .node(request.getNote() != null ? request.getNote() : "Cập nhật trạng thái: " + newStatus.name())
                .occurredAt(LocalDateTime.now())
                .build();

        TrackingHistory saved = trackingHistoryRepository.save(history);

        String redisKey = "shipment-status:" + trackingCode;
        redisTemplate.opsForValue().set(redisKey, newStatus.name());

        ShipmentStatusUpdatedEvent event = ShipmentStatusUpdatedEvent.builder()
                .trackingCode(trackingCode)
                .status(newStatus.name())
                .locationCode(saved.getLocationCode())
                .note(saved.getNode())
                .updatedAt(saved.getOccurredAt())
                .build();
        kafkaTemplate.send("tracking-status-events",trackingCode, event);
        return saved;
    }
}
