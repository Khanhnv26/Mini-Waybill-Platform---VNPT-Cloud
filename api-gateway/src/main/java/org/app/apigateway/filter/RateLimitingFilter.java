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

        Bucket bucket = rateLimitService.resolveBucket(clientIP);

        ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1);
        if(probe.isConsumed()) {
            response.setHeader("X-Rate-Limit-Remaining", String.valueOf(probe.getRemainingTokens()));
            filterChain.doFilter(request, response);
        } else {
            long waitForRefill = Math.max(1, probe.getNanosToWaitForRefill() / 1_000_000_000);
            response.setHeader("X-Rate-Limit-Retry-After-Seconds", String.valueOf(waitForRefill));
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType("application/json");
            log.warn("Rate limit exceeded for IP: {} - Wait: {}s", clientIP, waitForRefill);
            response.getWriter().write("{\"error\": \"Too many requests. Please try again later.\"}");
        }
    }

    private String getClientIP(HttpServletRequest request) {
        String xfHeader = request.getHeader("X-Forwarded-For");
        if(xfHeader == null || xfHeader.isEmpty()) {
            return request.getRemoteAddr();
        }

        return xfHeader.split(",")[0].trim();
    }
}
