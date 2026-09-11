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

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.HashMap;
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
        String redisLocKey = "shipment-location:" + trackingCode;
        String cacheLoc = redisTemplate.opsForValue().get(redisLocKey);

        if (cacheStatus != null) {
            log.info("Cache HIT cho đơn: {} -> Status: {}, Location: {}", trackingCode, cacheStatus, cacheLoc);
            Map<String, String> res = new HashMap<>();
            res.put("trackingCode", trackingCode);
            res.put("currentStatus", cacheStatus);
            res.put("locationCode", cacheLoc != null ? cacheLoc : "");
            res.put("source", "REDIS_CACHE");
            return res;
        }

        log.warn("Cache MISS cho đơn: {}, đang đọc từ SQL Server...", trackingCode);

        TrackingHistory latestHistory = trackingHistoryRepository.findTopByTrackingCodeOrderByOccurredAtDesc(trackingCode).orElse(null);
        if (latestHistory != null) {
            redisTemplate.opsForValue().set(redisKey, latestHistory.getStatus(), Duration.ofDays(7));
            String loc = latestHistory.getLocationCode() != null ? latestHistory.getLocationCode() : "";
            redisTemplate.opsForValue().set(redisLocKey, loc, Duration.ofDays(7));
            Map<String, String> res = new HashMap<>();
            res.put("trackingCode", trackingCode);
            res.put("currentStatus", latestHistory.getStatus());
            res.put("locationCode", loc);
            res.put("source", "SQL_SERVER");
            return res;
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
        boolean isAdminOrCS = roles != null && (roles.contains("ADMIN") || roles.contains("CS") || roles.contains("ROLE_ADMIN") || roles.contains("ROLE_CS"));
        boolean isHubStaff = roles != null && roles.contains("ROLE_HUB_OPERATOR");
        boolean isPostStaff = roles != null && (roles.contains("ROLE_POST_OFFICE_OPERATOR") || roles.contains("ROLE_POST_OFFICE_STAFF"));
        boolean isShipper = roles != null && roles.contains("ROLE_SHIPPER");
        boolean isCustomer = roles != null && roles.contains("ROLE_CUSTOMER") && !isAdminOrCS && !isHubStaff && !isPostStaff && !isShipper;


        if(isCustomer) {
            throw new ForbiddenException("Khách hàng không có quyền cập nhật trạng thái đơn hàng.");
        }

        if(!isAdminOrCS) {

            if(isHubStaff) {
                if (newStatus == ShipmentStatus.IN_TRANSIT || newStatus == ShipmentStatus.ARRIVED_DEST_HUB) {
                    throw new ForbiddenException("Nhân viên Kho Tổng không được đổi trạng thái " + newStatus + " thủ công cho từng đơn lẻ. Trạng thái xuất bến và cập bến tại Kho Tổng phải được kích hoạt thông qua module Quản lý Chuyến xe trục (Trips)!");
                }
                if (!Set.of(ShipmentStatus.PICKED_UP).contains(newStatus)) {
                    throw new ForbiddenException("Nhân viên Kho Tổng chỉ có quyền quét tiếp nhận bưu phẩm vào trạm trục!");
                }
            }

            if(isPostStaff) {
                if (!Set.of(ShipmentStatus.PICKED_UP, ShipmentStatus.IN_TRANSIT, ShipmentStatus.ARRIVED_DEST_HUB, ShipmentStatus.OUT_FOR_DELIVERY).contains(newStatus)) {
                    throw new ForbiddenException("Nhân viên Bưu Cục chỉ có quyền tiếp nhận quầy, xuất/nhận xe trung chuyển hoặc bàn giao bưu tá!");
                }
                if (newStatus == ShipmentStatus.IN_TRANSIT) {
                    if (request.getNote() == null || (!request.getNote().toLowerCase().contains("xe") && !request.getNote().toLowerCase().contains("bks"))) {
                        throw new IllegalArgumentException("Trạng thái xuất chuyển Feeder (IN_TRANSIT) tại bưu cục yêu cầu thông tin phương tiện (BKS xe, lái xe)!");
                    }
                }
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
        redisTemplate.opsForValue().set(redisKey, newStatus.name(), Duration.ofDays(7));
        String redisLocKey = "shipment-location:" + trackingCode;
        redisTemplate.opsForValue().set(redisLocKey, saved.getLocationCode() != null ? saved.getLocationCode() : "", Duration.ofDays(7));

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
