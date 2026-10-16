package org.app.apigateway.filter;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import io.lettuce.core.api.StatefulRedisConnection;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.app.apigateway.util.HeaderMapRequestWrapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import javax.crypto.SecretKey;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
@Slf4j
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    @Value("${app.jwt.secret}")
    private String secretKey;

    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(secretKey.getBytes(StandardCharsets.UTF_8));
    }

    private final StatefulRedisConnection<String, String> redisConnection;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain) throws ServletException, IOException {
        String authHeader = request.getHeader("Authorization");

        if(authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(blankIdentityHeaders(request), response);
            return;
        }

        String token = authHeader.substring(7);
        HttpServletRequest forwardedRequest;
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(getSigningKey())
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();

            String email = claims.getSubject();
            Object userIdClaim = claims.get("userId");
            String userId = (userIdClaim != null && !"null".equalsIgnoreCase(String.valueOf(userIdClaim))) ? String.valueOf(userIdClaim) : "";
            Object locationClaim = claims.get("locationCode");
            String locationCode = locationClaim != null && !"null".equalsIgnoreCase(String.valueOf(locationClaim))
                    ? String.valueOf(locationClaim).trim()
                    : "";

            //kiem tra blacklist trong redis
            if(!userId.isBlank()) {
                if (redisConnection.sync().exists("auth:pending:user:" + userId) > 0) {
                    response.sendError(401);
                    return;
                }
                String currentVersion = redisConnection.sync().get("auth:version:user:" + userId);
                if (currentVersion == null || !currentVersion.equals(claims.get("authVersion", String.class))) {
                    response.sendError(401, "Phiên đăng nhập đã hết hiệu lực");
                    return;
                }
                String blackKeyList = "auth:blacklist:user:" + userId;
                Long isBacklisted = redisConnection.sync().exists(blackKeyList);
                if (isBacklisted != null && isBacklisted > 0) {
                    log.warn("Token cho userId {} đã bị blacklist. Bỏ qua xác thực.", userId);
                    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                    response.setContentType("application/json;charset = UTF-8");
                    response.getWriter().write("{\"error\": \"Tài khoản đã bị blacklist.\"}");
                    return;
                }
            }

            @SuppressWarnings("unchecked")
            List<String> roles = claims.get("roles",List.class);
            Map<?, ?> roleVersions = claims.get("roleVersions", Map.class);
            if (userId.isBlank() || roles == null || roleVersions == null) {
                response.sendError(401);
                return;
            }
            for (String role : roles) {
                if (redisConnection.sync().exists("auth:pending:role:" + role) > 0) {
                    response.sendError(401);
                    return;
                }
                String version = redisConnection.sync().get("auth:version:role:" + role);
                if (version == null || !version.equals(roleVersions.get(role))) {
                    response.sendError(401, "Quyền truy cập đã thay đổi. Vui lòng đăng nhập lại");
                    return;
                }
            }
            @SuppressWarnings("unchecked")
            List<String> permissions = claims.get("permissions",List.class);

            List<SimpleGrantedAuthority> authorities = new ArrayList<>();
            if(roles != null) {
                for (String role : roles) {
                    authorities.add(new SimpleGrantedAuthority(role.startsWith("ROLE_") ? role : "ROLE_" + role));
                }
            }

            if(permissions != null) {
                for (String perm : permissions) {
                    authorities.add(new SimpleGrantedAuthority(perm));
                }
            }

            UsernamePasswordAuthenticationToken authenticationToken = new UsernamePasswordAuthenticationToken(email, null, authorities);
            SecurityContextHolder.getContext().setAuthentication(authenticationToken);

            HeaderMapRequestWrapper wrapperRequest  = new HeaderMapRequestWrapper(request);
            wrapperRequest.addHeader("X-User-Id", userId != null ? userId : "");
            wrapperRequest.addHeader("X-User-Email", email != null ? email : "");
            wrapperRequest.addHeader("X-User-Roles", roles != null ? String.join(",", roles) : "");
            wrapperRequest.addHeader("X-User-Permissions", permissions != null ? String.join(",", permissions) : "");
            // Always overwrite the inbound value. Downstream services must
            // trust only the station assignment from the signed JWT, never a
            // client-supplied X-User-Location-Code header.
            wrapperRequest.addHeader("X-User-Location-Code", locationCode);
            wrapperRequest.addHeader("X-Gateway-Request", "true");

            forwardedRequest = wrapperRequest;

        } catch (Exception e) {
            log.error("Lỗi xác thực JWT tại Gateway: {}", e.getMessage());

            SecurityContextHolder.clearContext();
            forwardedRequest = blankIdentityHeaders(request);

        }
        filterChain.doFilter(forwardedRequest, response);


    }

    /**
     * Client không được tự khai báo danh tính. Không có JWT hợp lệ thì các header này phải rỗng.
     */
    private HttpServletRequest blankIdentityHeaders(HttpServletRequest request) {
        HeaderMapRequestWrapper wrapper = new HeaderMapRequestWrapper(request);
        wrapper.addHeader("X-User-Id", "");
        wrapper.addHeader("X-User-Email", "");
        wrapper.addHeader("X-User-Roles", "");
        wrapper.addHeader("X-User-Permissions", "");
        wrapper.addHeader("X-User-Location-Code", "");
        wrapper.addHeader("X-Gateway-Request", "true");
        return wrapper;
    }


}


