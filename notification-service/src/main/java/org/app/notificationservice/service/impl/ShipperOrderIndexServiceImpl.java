package org.app.notificationservice.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.app.notificationservice.service.ShipperOrderIndexService;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Collections;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class ShipperOrderIndexServiceImpl implements ShipperOrderIndexService {

    private static final String ASSIGN_KEY_PREFIX = "shipper:assigned:";
    private static final String ORDER_KEY_PREFIX = "shipper:orders:";
    private static final String COD_KEY_PREFIX = "shipper:cod:";
    private static final Duration TTL = Duration.ofDays(30);

    private final StringRedisTemplate stringRedisTemplate;

    @Override
    public void addOrder(String courierCode, String trackingCode) {
        if (isBlank(courierCode) || isBlank(trackingCode)) {
            return;
        }
        String key = ORDER_KEY_PREFIX + courierCode.trim();
        stringRedisTemplate.opsForSet().add(key, trackingCode.trim());
        stringRedisTemplate.expire(key, TTL);
        log.info("[BOT-INDEX] Gán đơn {} cho bưu tá {}", trackingCode, courierCode);
    }

    @Override
    public void removeOrder(String courierCode, String trackingCode) {
        if (isBlank(courierCode) || isBlank(trackingCode)) {
            return;
        }
        stringRedisTemplate.opsForSet().remove(ORDER_KEY_PREFIX + courierCode.trim(), trackingCode.trim());
    }

    @Override
    public void removeOrderByTrackingCode(String trackingCode) {
        String courierCode = assignedCourier(trackingCode);
        if (!isBlank(courierCode)) {
            removeOrder(courierCode, trackingCode);
            stringRedisTemplate.opsForSet().remove(COD_KEY_PREFIX + courierCode, trackingCode.trim());
        }
    }

    @Override
    public void addCodPending(String courierCode, String trackingCode) {
        if (isBlank(courierCode) || isBlank(trackingCode)) {
            return;
        }
        String key = COD_KEY_PREFIX + courierCode.trim();
        stringRedisTemplate.opsForSet().add(key, trackingCode.trim());
        stringRedisTemplate.expire(key, TTL);
    }

    @Override
    public void removeCodPendingByTrackingCode(String trackingCode) {
        String courierCode = assignedCourier(trackingCode);
        if (!isBlank(courierCode)) {
            stringRedisTemplate.opsForSet().remove(COD_KEY_PREFIX + courierCode, trackingCode.trim());
        }
    }

    @Override
    public void moveToCodPending(String trackingCode) {
        String courierCode = assignedCourier(trackingCode);
        if (isBlank(courierCode)) {
            return;
        }
        removeOrder(courierCode, trackingCode);
        addCodPending(courierCode, trackingCode);
    }

    @Override
    public boolean isAssignedTo(String courierCode, String trackingCode) {
        if (isBlank(courierCode) || isBlank(trackingCode)) {
            return false;
        }
        String assigned = assignedCourier(trackingCode);
        return courierCode.trim().equalsIgnoreCase(assigned);
    }

    @Override
    public Set<String> getOrders(String courierCode) {
        return members(ORDER_KEY_PREFIX + (courierCode == null ? "" : courierCode.trim()));
    }

    @Override
    public Set<String> getCodPending(String courierCode) {
        return members(COD_KEY_PREFIX + (courierCode == null ? "" : courierCode.trim()));
    }

    private Set<String> members(String key) {
        Set<String> members = stringRedisTemplate.opsForSet().members(key);
        return members != null ? members : Collections.emptySet();
    }

    private String assignedCourier(String trackingCode) {
        if (isBlank(trackingCode)) {
            return null;
        }
        return stringRedisTemplate.opsForValue().get(ASSIGN_KEY_PREFIX + trackingCode.trim());
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}