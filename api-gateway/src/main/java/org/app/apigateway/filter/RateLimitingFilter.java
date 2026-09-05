package org.app.apigateway.filter;

import io.github.bucket4j.Bucket;
import io.github.bucket4j.ConsumptionProbe;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.app.apigateway.service.RateLimitService;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 1)
@Slf4j
public class RateLimitingFilter extends OncePerRequestFilter {


    private final RateLimitService rateLimitService;

    public RateLimitingFilter(RateLimitService rateLimitService) {
        this.rateLimitService = rateLimitService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain) throws ServletException, IOException {
        String clientIP = getClientIP(request);

        Bucket userBucket = rateLimitService.resolveBucket(clientIP);
        ConsumptionProbe userProbe = userBucket.tryConsumeAndReturnRemaining(1);

        if (!userProbe.isConsumed()) {

            long waitForRefill = Math.max(1, userProbe.getNanosToWaitForRefill() / 1_000_000_000);
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setHeader("Retry-After", String.valueOf(waitForRefill));
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write("{\"status\": 429, \"error\": \"User Limit Exceeded\", \"message\": \"Bạn đã gửi quá nhiều yêu cầu cá nhân. Vui lòng thử lại sau!\"}");
            return;
        }

        Bucket globalBucket = rateLimitService.resolveGlobalBucket();
        ConsumptionProbe globalProbe = globalBucket.tryConsumeAndReturnRemaining(1);

        if (!globalProbe.isConsumed()) {

            long waitForRefill = Math.max(1, globalProbe.getNanosToWaitForRefill() / 1_000_000_000);
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setHeader("Retry-After", String.valueOf(waitForRefill));
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write("{\"status\": 429, \"error\": \"System Overload\", \"message\": \"Hệ thống đang quá tải! Vui lòng chờ vài giây để phục vụ tiếp!\"}");
            return;
        }


        response.setHeader("X-Rate-Limit-Remaining", String.valueOf(userProbe.getRemainingTokens()));
        response.setHeader("X-Global-Rate-Limit-Remaining", String.valueOf(globalProbe.getRemainingTokens()));
        filterChain.doFilter(request, response);
    }

    private String getClientIP(HttpServletRequest request) {
        String xfHeader = request.getHeader("X-Forwarded-For");
        if(xfHeader == null || xfHeader.isEmpty()) {
            return request.getRemoteAddr();
        }

        return xfHeader.split(",")[0].trim();
    }
}
