package org.app.authservice.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SessionRevocationService {
    private final StringRedisTemplate redis;
    @org.springframework.beans.factory.annotation.Value("${app.jwt.expiration-ms:86400000}")
    private long tokenLifetimeMillis;

    public String userVersion(Long userId) { return version("auth:version:user:" + userId); }
    public String roleVersion(String role) { return version("auth:version:role:" + role); }
    public void revokeUser(Long userId) { revoke("auth:version:user:" + userId); }
    public void revokeRole(String role) { revoke("auth:version:role:" + role); }

    private String version(String key) {
        if (Boolean.TRUE.equals(redis.hasKey(key.replace("auth:version:", "auth:pending:")))) {
            throw new IllegalStateException("Phiên đăng nhập đang được cập nhật. Vui lòng thử lại sau");
        }
        String value = redis.opsForValue().get(key);
        if (value == null) {
            redis.opsForValue().setIfAbsent(key, UUID.randomUUID().toString());
            value = redis.opsForValue().get(key);
        }
        if (value == null) throw new IllegalStateException("Không thể xác minh phiên đăng nhập");
        return value;
    }

    private void revoke(String key) {
        String pending = key.replace("auth:version:", "auth:pending:");
        redis.opsForValue().set(pending, "1", java.time.Duration.ofMillis(Math.max(1000, tokenLifetimeMillis)));
        Runnable write = () -> {
            redis.opsForValue().set(key, UUID.randomUUID().toString());
            redis.delete(pending);
        };
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override public void afterCommit() { write.run(); }
                @Override public void afterCompletion(int status) {
                    if (status != TransactionSynchronization.STATUS_COMMITTED) redis.delete(pending);
                }
            });
        } else {
            write.run();
        }
    }
}
