package org.app.authservice.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.app.authservice.repository.UserRepository;
import org.app.authservice.service.JwtService;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class AdminAuthorizationFilter extends OncePerRequestFilter {
    private final JwtService jwtService;
    private final UserRepository users;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getServletPath();
        return !path.equals("/api/admin") && !path.startsWith("/api/admin/");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String authorization = request.getHeader("Authorization");
        Long userId = authorization != null && authorization.startsWith("Bearer ")
                ? jwtService.extractUserId(authorization.substring(7)) : null;
        if (userId == null) { response.sendError(401); return; }
        boolean admin = users.findById(userId).map(u -> u.getRoles().stream()
                .anyMatch(r -> "ROLE_ADMIN".equals(r.getName()))).orElse(false);
        if (!admin) { response.sendError(403); return; }
        chain.doFilter(request, response);
    }
}
