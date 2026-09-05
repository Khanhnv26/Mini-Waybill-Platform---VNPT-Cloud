package org.app.apigateway.filter;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;
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
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    @Value("${app.jwt.secret}")
    private String secretKey;

    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(secretKey.getBytes(StandardCharsets.UTF_8));
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain) throws ServletException, IOException {
        String authHeader = request.getHeader("Authorization");

        //Nếu không có Token Bearer, cứ cho đi tiếp (Spring Security sẽ tự chặn nếu route đó là private)
        if(authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }


        String token = authHeader.substring(7);
        // giai ma token, lay thong tin user va role
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(getSigningKey())
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();

            String email = claims.getSubject();
            String userId = String.valueOf(claims.get("userId"));

            @SuppressWarnings("unchecked")
            List<String> roles = claims.get("roles",List.class);
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

            //Đồng thời nhồi Header chuyển tiếp xuống các microservice nội bộ
            HeaderMapRequestWrapper wrapperRequest  = new HeaderMapRequestWrapper(request);
            wrapperRequest.addHeader("X-User-Id", userId != null ? userId : "");
            wrapperRequest.addHeader("X-User-Email", email != null ? email : "");
            wrapperRequest.addHeader("X-User-Roles", roles != null ? String.join(",", roles) : "");
            wrapperRequest.addHeader("X-User-Permissions", permissions != null ? String.join(",", permissions) : "");

            filterChain.doFilter(wrapperRequest, response);

        } catch (Exception e) {
            // Nếu token bị giả mạo hoặc hết hạn, xóa sạch context
            log.error("Lỗi xác thực JWT tại Gateway: {}", e.getMessage());

            SecurityContextHolder.clearContext();
            filterChain.doFilter(request, response);

        }


    }


}


