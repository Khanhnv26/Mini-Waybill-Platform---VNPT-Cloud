package org.app.trackingservice.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.app.trackingservice.entity.TrackingHistory;
import org.app.trackingservice.repository.TrackingHistoryRepository;
import org.app.trackingservice.service.TrackingService;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class TrackingServiceImpl implements TrackingService {
    private final TrackingHistoryRepository trackingHistoryRepository;
    private final StringRedisTemplate redisTemplate;

    @Override
    public Map<String, String> getCurrentStatus(String trackingCode) {
        String redisKey = "shipment-status:" + trackingCode;
        String cacheStatus = redisTemplate.opsForValue().get(redisKey);

        if(cacheStatus != null) {
            log.info("Cache HIT cho đơn: {} -> Status: {}", trackingCode, cacheStatus);
            return Map.of("trackingCode", trackingCode, "currentStatus", cacheStatus, "source", "REDIS_CACHE");
        }

        log.warn("Cache MISS cho đơn: {}, đang đọc từ SQL Server...", trackingCode);

        TrackingHistory latestHistory = trackingHistoryRepository.findTopByTrackingCodeOrderByOccurredAtDesc(trackingCode)
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy thông tin tracking cho mã: " + trackingCode));
        redisTemplate.opsForValue().set(redisKey, latestHistory.getStatus());

        return Map.of("trackingCode", trackingCode, "currentStatus", latestHistory.getStatus(), "source", "SQL_SERVER");
    }

    @Override
    public List<TrackingHistory> getTrackingHistory(String trackingCode) {
        return trackingHistoryRepository.findByTrackingCodeOrderByOccurredAtAsc(trackingCode);
    }
}
