package org.app.authservice.service.impl;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.app.authservice.entity.User;
import org.app.authservice.service.JwtService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class JwtServiceImpl implements JwtService {
    private final org.app.authservice.service.SessionRevocationService sessions;
    private final org.app.authservice.repository.UserRepository users;

    @Value("${app.jwt.secret}")
    private String secretKey;

    @Value("${app.jwt.expiration-ms}")
    private Long expirationTime;

    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(secretKey.getBytes(StandardCharsets.UTF_8));
    }

    @Override
    public String generateToken(User user) {
        List<String> rolesName = user.getRoles().stream().map(role -> role.getName()).toList();

        List<String> permissions = user.getRoles().stream()
                .filter(role -> role.getPermissions() != null)
                .flatMap(role -> role.getPermissions().stream())
                .map(permission -> permission.getCode())
                .distinct()
                .toList();

        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + expirationTime);

        return Jwts.builder()
                .subject(user.getEmail())
                .claim("userId", user.getId())
                .claim("authVersion", sessions.userVersion(user.getId()))
                .claim("roleVersions", rolesName.stream().collect(Collectors.toMap(r -> r, sessions::roleVersion)))
                .claim("roles", rolesName)
                .claim("fullname", user.getFullName())
                .claim("locationCode", user.getLocationCode())
                .claim("avatarUrl", user.getAvatarUrl())
                .claim("permissions", permissions)
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(getSigningKey())
                .compact();

    }

    @Override
    public Long extractUserId(String token) {
        if (token == null || token.isBlank()) {
            return null;
        }
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(getSigningKey())
                    .build()
                    .parseSignedClaims(token.trim())
                    .getPayload();
            Object uid = claims.get("userId");
            if (uid != null) {
                Long userId = Long.parseLong(uid.toString());
                if (!sessions.userVersion(userId).equals(claims.get("authVersion", String.class))) return null;
                Map<?, ?> versions = claims.get("roleVersions", Map.class);
                List<?> roles = claims.get("roles", List.class);
                if (versions == null || roles == null) return null;
                for (Object role : roles) {
                    if (!sessions.roleVersion(role.toString()).equals(versions.get(role.toString()))) return null;
                }
                return users.findById(userId).filter(u -> "ACTIVE".equalsIgnoreCase(u.getStatus()))
                        .map(User::getId).orElse(null);
            }
        } catch (Exception ignored) {}
        return null;
    }
}
