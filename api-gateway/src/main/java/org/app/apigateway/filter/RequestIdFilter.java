package org.app.apigateway.filter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@Slf4j
@Order(Ordered.HIGHEST_PRECEDENCE)
public class RequestIdFilter extends OncePerRequestFilter {

    private final static String REQUEST_ID_HEADER = "X-Request-ID";

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain) throws ServletException, IOException {
        String requestId = request.getHeader(REQUEST_ID_HEADER);

        if (requestId == null || requestId.isEmpty()) {
            requestId = java.util.UUID.randomUUID().toString();
            log.info("Generated new Request ID: {}", requestId);
        }

        response.setHeader(REQUEST_ID_HEADER, requestId);

        log.info("Request ID: {} - Method: {} - URI: {}", requestId, request.getMethod(), request.getRequestURI());
        filterChain.doFilter(request, response);
    }
}
