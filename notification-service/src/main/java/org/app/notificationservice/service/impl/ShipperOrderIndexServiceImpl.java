package org.app.notificationservice.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.app.notificationservice.service.ShipperOrderIndexService;
import org.springframework.data.redis.core.HashOperations;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class ShipperOrderIndexServiceImpl implements ShipperOrderIndexService {

    private static final String ASSIGN_KEY_PREFIX = "shipper:assigned:";
    private static final String ORDER_KEY_PREFIX = "shipper:orders:";
    private static final String COD_PENDING_PREFIX = "shipper:cod:";
    private static final String COD_SENT_PREFIX = "shipper:codsent:";
    private static final String COD_SETTLED_PREFIX = "shipper:codsettled:";
    private static final String DELIVERED_TODAY_PREFIX = "shipper:delivered:";
    private static final String PAYWATCH_PREFIX = "shipper:paywatch:";
    private static final String PAYWATCH_ACTIVE = "shipper:paywatch:active";

    private static final Duration TTL = Duration.ofDays(30);
    private static final Duration DELIVERED_TTL = Duration.ofDays(3);
    private static final Duration PAYWATCH_TTL = Duration.ofMinutes(20);

    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("yyyyMMdd");

    private final StringRedisTemplate stringRedisTemplate;

    @Override
    public void addOrder(String courierCode, String trackingCode) {
        if (isBlank(courierCode) || isBlank(trackingCode)) {
            return;
        }
        String key = ORDER_KEY_PREFIX + courierCode.trim();
        stringRedisTemplate.opsForSet().add(key, trackingCode.trim());
        stringRedisTemplate.expire(key, TTL);
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
            stringRedisTemplate.opsForSet().remove(COD_PENDING_PREFIX + courierCode, trackingCode.trim());
        }
    }

    @Override
    public void addCodPending(String courierCode, String trackingCode) {
        if (isBlank(courierCode) || isBlank(trackingCode)) {
            return;
        }
        String key = COD_PENDING_PREFIX + courierCode.trim();
        stringRedisTemplate.opsForSet().add(key, trackingCode.trim());
        stringRedisTemplate.expire(key, TTL);
        stringRedisTemplate.opsForSet().remove(COD_SENT_PREFIX + courierCode.trim(), trackingCode.trim());
        stringRedisTemplate.opsForSet().remove(COD_SETTLED_PREFIX + courierCode.trim(), trackingCode.trim());
    }

    @Override
    public void removeCodPendingByTrackingCode(String trackingCode) {
        String courierCode = assignedCourier(trackingCode);
        if (!isBlank(courierCode)) {
            stringRedisTemplate.opsForSet().remove(COD_PENDING_PREFIX + courierCode, trackingCode.trim());
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
    public void applySettlementStatus(String trackingCode, String settlementStatus) {
        String courierCode = assignedCourier(trackingCode);
        if (isBlank(courierCode) || isBlank(settlementStatus)) {
            return;
        }
        String code = trackingCode.trim();
        String courier = courierCode.trim();
        String normalized = settlementStatus.trim().toUpperCase();

        if ("PENDING_SETTLEMENT".equals(normalized)) {
            stringRedisTemplate.opsForSet().remove(COD_PENDING_PREFIX + courier, code);
            stringRedisTemplate.opsForSet().add(COD_SENT_PREFIX + courier, code);
            stringRedisTemplate.expire(COD_SENT_PREFIX + courier, TTL);
        } else if ("SETTLED".equals(normalized)) {
            stringRedisTemplate.opsForSet().remove(COD_PENDING_PREFIX + courier, code);
            stringRedisTemplate.opsForSet().remove(COD_SENT_PREFIX + courier, code);
            stringRedisTemplate.opsForSet().add(COD_SETTLED_PREFIX + courier, code);
            stringRedisTemplate.expire(COD_SETTLED_PREFIX + courier, TTL);
        }
    }

    @Override
    public void markDeliveredToday(String courierCode, String trackingCode) {
        if (isBlank(courierCode) || isBlank(trackingCode)) {
            return;
        }
        String key = DELIVERED_TODAY_PREFIX + courierCode.trim() + ":" + LocalDate.now().format(DAY);
        stringRedisTemplate.opsForSet().add(key, trackingCode.trim());
        stringRedisTemplate.expire(key, DELIVERED_TTL);
    }

    @Override
    public boolean isAssignedTo(String courierCode, String trackingCode) {
        if (isBlank(courierCode) || isBlank(trackingCode)) {
            return false;
        }
        return courierCode.trim().equalsIgnoreCase(assignedCourier(trackingCode));
    }

    @Override
    public Set<String> getOrders(String courierCode) {
        return members(ORDER_KEY_PREFIX + safe(courierCode));
    }

    @Override
    public Set<String> getCodPending(String courierCode) {
        return members(COD_PENDING_PREFIX + safe(courierCode));
    }

    @Override
    public Set<String> getCodSent(String courierCode) {
        return members(COD_SENT_PREFIX + safe(courierCode));
    }

    @Override
    public Set<String> getCodSettled(String courierCode) {
        return members(COD_SETTLED_PREFIX + safe(courierCode));
    }

    @Override
    public Set<String> getDeliveredToday(String courierCode) {
        if (isBlank(courierCode)) {
            return Collections.emptySet();
        }
        return members(DELIVERED_TODAY_PREFIX + courierCode.trim() + ":" + LocalDate.now().format(DAY));
    }

    @Override
    public void registerPaymentWatch(String trackingCode, String chatId, Integer messageId,
                                     String courierCode, String type, String amount) {
        if (isBlank(trackingCode)) {
            return;
        }
        String key = PAYWATCH_PREFIX + trackingCode.trim();
        Map<String, String> values = new HashMap<>();
        values.put("chatId", safe(chatId));
        values.put("messageId", messageId != null ? String.valueOf(messageId) : "");
        values.put("courierCode", safe(courierCode));
        values.put("type", safe(type));
        values.put("amount", safe(amount));
        HashOperations<String, Object, Object> hash = stringRedisTemplate.opsForHash();
        hash.putAll(key, values);
        stringRedisTemplate.expire(key, PAYWATCH_TTL);
        stringRedisTemplate.opsForSet().add(PAYWATCH_ACTIVE, trackingCode.trim());
        stringRedisTemplate.expire(PAYWATCH_ACTIVE, Duration.ofDays(1));
    }

    @Override
    public Map<String, String> getPaymentWatch(String trackingCode) {
        if (isBlank(trackingCode)) {
            return Collections.emptyMap();
        }
        Map<Object, Object> raw = stringRedisTemplate.opsForHash().entries(PAYWATCH_PREFIX + trackingCode.trim());
        if (raw == null || raw.isEmpty()) {
            return Collections.emptyMap();
        }
        Map<String, String> result = new HashMap<>();
        raw.forEach((k, v) -> result.put(String.valueOf(k), v != null ? String.valueOf(v) : null));
        return result;
    }

    @Override
    public void clearPaymentWatch(String trackingCode) {
        if (isBlank(trackingCode)) {
            return;
        }
        stringRedisTemplate.delete(PAYWATCH_PREFIX + trackingCode.trim());
        stringRedisTemplate.opsForSet().remove(PAYWATCH_ACTIVE, trackingCode.trim());
    }

    @Override
    public Set<String> getPaymentWatchCodes() {
        return members(PAYWATCH_ACTIVE);
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

    private String safe(String value) {
        return value == null ? "" : value;
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}