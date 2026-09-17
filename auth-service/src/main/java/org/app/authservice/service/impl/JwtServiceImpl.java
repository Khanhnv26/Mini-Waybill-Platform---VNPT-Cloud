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

@Service
public class JwtServiceImpl implements JwtService {

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
                return Long.parseLong(uid.toString());
            }
        } catch (Exception ignored) {}
        return null;
    }
}
