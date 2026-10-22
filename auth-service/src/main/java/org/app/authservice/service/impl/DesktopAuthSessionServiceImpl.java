package org.app.authservice.service.impl;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.app.authservice.dto.request.DesktopSessionCompleteRequest;
import org.app.authservice.dto.response.AuthResponse;
import org.app.authservice.dto.response.DesktopSessionInitResponse;
import org.app.authservice.dto.response.DesktopSessionStatusResponse;
import org.app.authservice.entity.Permission;
import org.app.authservice.entity.Role;
import org.app.authservice.entity.User;
import org.app.authservice.service.AuthService;
import org.app.authservice.service.DesktopAuthSessionService;
import org.app.authservice.service.GoogleVerifyService;
import org.app.authservice.service.JwtService;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class DesktopAuthSessionServiceImpl implements DesktopAuthSessionService {

    private static final String REDIS_PREFIX = "auth:desktop:session:";
    private static final long SESSION_TTL_SECONDS = 300L;
    private static final long SUCCESS_TTL_SECONDS = 120L;

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;
    private final GoogleVerifyService googleVerifyService;
    private final AuthService authService;
    private final JwtService jwtService;

    private final ConcurrentHashMap<String, SessionPayload> localCache = new ConcurrentHashMap<>();

    @Value("${app.auth.desktop-fallback-origin:http://localhost:3000}")
    private String defaultOrigin;

    @Value("${app.auth.allow-localhost-origin:true}")
    private boolean allowLocalhostOrigin;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    private static class SessionPayload {
        private String status;
        private Long expiresAt;
        private AuthResponse authResponse;
    }

    @Override
    public DesktopSessionInitResponse initSession(String clientOrigin) {
        String sessionId = UUID.randomUUID().toString();
        long now = System.currentTimeMillis();
        long expiresAt = now + (SESSION_TTL_SECONDS * 1000);

        SessionPayload payload = SessionPayload.builder()
                .status("PENDING")
                .expiresAt(expiresAt)
                .authResponse(null)
                .build();

        savePayload(sessionId, payload, Duration.ofSeconds(SESSION_TTL_SECONDS));

        String base = (clientOrigin != null && !clientOrigin.isBlank()) ? clientOrigin.trim() : "";
        if (base.isEmpty() || (!allowLocalhostOrigin && base.contains("localhost"))) {
            base = defaultOrigin;
        }
        if (base.endsWith("/")) {
            base = base.substring(0, base.length() - 1);
        }
        String loginUrl = base + "/login.html?desktopSession=" + sessionId;

        return DesktopSessionInitResponse.builder()
                .sessionId(sessionId)
                .expiresInSeconds(SESSION_TTL_SECONDS)
                .loginUrl(loginUrl)
                .build();
    }

    @Override
    public DesktopSessionStatusResponse getSessionStatus(String sessionId) {
        if (sessionId == null || sessionId.isBlank()) {
            return DesktopSessionStatusResponse.builder().status("EXPIRED").build();
        }

        SessionPayload payload = loadPayload(sessionId);
        if (payload == null || System.currentTimeMillis() > payload.getExpiresAt()) {
            evictPayload(sessionId);
            return DesktopSessionStatusResponse.builder().status("EXPIRED").build();
        }

        return DesktopSessionStatusResponse.builder()
                .status(payload.getStatus())
                .auth(payload.getAuthResponse())
                .build();
    }

    @Override
    public AuthResponse completeSession(DesktopSessionCompleteRequest request) throws Exception {
        String sessionId = request.getSessionId();
        SessionPayload payload = loadPayload(sessionId);

        if (payload == null || System.currentTimeMillis() > payload.getExpiresAt()) {
            evictPayload(sessionId);
            throw new IllegalArgumentException("Phiên đăng nhập Desktop đã hết hạn hoặc không tồn tại.");
        }

        if (!"PENDING".equals(payload.getStatus())) {
            throw new IllegalStateException("Phiên đăng nhập này đã được hoàn tất trước đó.");
        }

        GoogleIdToken.Payload tokenPayload = googleVerifyService.verifyToken(request.getIdToken());
        User user = authService.processGoogleUser(tokenPayload);
        String jwt = jwtService.generateToken(user);
        AuthResponse authResponse = buildAuthResponse(user, jwt);

        payload.setStatus("SUCCESS");
        payload.setAuthResponse(authResponse);
        payload.setExpiresAt(System.currentTimeMillis() + (SUCCESS_TTL_SECONDS * 1000));

        savePayload(sessionId, payload, Duration.ofSeconds(SUCCESS_TTL_SECONDS));

        return authResponse;
    }

    private void savePayload(String sessionId, SessionPayload payload, Duration ttl) {
        localCache.put(sessionId, payload);
        try {
            String json = objectMapper.writeValueAsString(payload);
            redisTemplate.opsForValue().set(REDIS_PREFIX + sessionId, json, ttl);
        } catch (Exception e) {
            log.warn("[DESKTOP-AUTH] Redis set failed for session {}, using local cache: {}", sessionId, e.getMessage());
        }
    }

    private SessionPayload loadPayload(String sessionId) {
        try {
            String json = redisTemplate.opsForValue().get(REDIS_PREFIX + sessionId);
            if (json != null && !json.isBlank()) {
                return objectMapper.readValue(json, SessionPayload.class);
            }
        } catch (Exception e) {
            log.warn("[DESKTOP-AUTH] Redis get failed for session {}, falling back to local cache: {}", sessionId, e.getMessage());
        }
        return localCache.get(sessionId);
    }

    private void evictPayload(String sessionId) {
        localCache.remove(sessionId);
        try {
            redisTemplate.delete(REDIS_PREFIX + sessionId);
        } catch (Exception ignored) {
        }
    }

    private AuthResponse buildAuthResponse(User user, String jwt) {
        List<String> permissions = user.getRoles() != null ?
                user.getRoles().stream()
                        .filter(role -> role.getPermissions() != null)
                        .flatMap(role -> role.getPermissions().stream())
                        .map(Permission::getCode)
                        .distinct()
                        .toList() : List.of();

        List<String> roles = user.getRoles() != null ?
                user.getRoles().stream().map(Role::getName).toList() : List.of();

        return AuthResponse.builder()
                .accessToken(jwt)
                .tokenType("Bearer")
                .userId(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .phoneNumber(user.getPhoneNumber())
                .avatarUrl(user.getAvatarUrl())
                .locationCode(user.getLocationCode())
                .roles(roles)
                .permissions(permissions)
                .googleLinked(user.getGoogleSub() != null && !user.getGoogleSub().isBlank())
                .build();
    }
}
