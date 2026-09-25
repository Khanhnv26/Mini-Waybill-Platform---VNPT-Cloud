package org.app.apigateway.config;

import jakarta.servlet.DispatcherType;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpMethod;
import lombok.RequiredArgsConstructor;
import org.app.apigateway.filter.JwtAuthenticationFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    @Bean
    public SecurityFilterChain filterChain (HttpSecurity http) throws Exception {

        return http.csrf(AbstractHttpConfigurer::disable)
                   .cors(Customizer.withDefaults())
                   .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .dispatcherTypeMatchers(DispatcherType.ERROR).permitAll()
                        .requestMatchers(
                        "/api/auth/login",
                        "/api/auth/register",
                        "/api/auth/google",
                        "/api/auth/forgot-password",
                        "/api/auth/reset-password").permitAll()
                        .requestMatchers(HttpMethod.GET,"/api/tracking/**").permitAll()
                        .requestMatchers(HttpMethod.GET,"/api/shipments/*").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/ratings/*/status").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/ratings").permitAll()
                        .requestMatchers(HttpMethod.GET,"/api/notifications/*").permitAll()
                        .requestMatchers(HttpMethod.GET,"/api/routing/hubs").permitAll()
                        .requestMatchers(HttpMethod.GET,"/api/routing/shipments/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/pricing/calculate").permitAll()
                        .requestMatchers(HttpMethod.PUT, "/api/tickets/*/assign", "/api/tickets/*/resolve").hasAnyRole("CS", "ADMIN")
                        // Danh sách toàn hệ thống chỉ dành cho CSKH. Khách tra cứu bằng ?trackingCode= hoặc /code/{ticketCode}.
                        .requestMatchers(SecurityConfig::isStaffOnlyTicketList).hasAnyRole("CS", "ADMIN")
                        .requestMatchers(SecurityConfig::isTicketByNumericId).authenticated()
                        .requestMatchers("/api/tickets", "/api/tickets/**", "/api/support/**").permitAll()
                        .requestMatchers("/api/admin", "/api/admin/**").hasRole("ADMIN")
                        .requestMatchers("/api/audits", "/api/audits/**").hasAnyRole("CS", "ADMIN")
                        .requestMatchers(HttpMethod.GET, "/api/shippers", "/api/shippers/**").hasAnyRole("ADMIN", "POST_OFFICE_OPERATOR", "POST_OFFICE_STAFF", "DISPATCHER")
                        .requestMatchers("/api/shippers", "/api/shippers/**").hasRole("ADMIN")
                        .anyRequest().authenticated())
                        .addFilterBefore(jwtAuthenticationFilter,UsernamePasswordAuthenticationFilter.class)
                        .build();

    }

    static boolean isStaffOnlyTicketList(HttpServletRequest request) {
        if (!"GET".equalsIgnoreCase(request.getMethod())) {
            return false;
        }
        if (!"/api/tickets".equals(normalizedPath(request))) {
            return false;
        }
        String trackingCode = request.getParameter("trackingCode");
        return trackingCode == null || trackingCode.isBlank();
    }

    static boolean isTicketByNumericId(HttpServletRequest request) {
        if (!"GET".equalsIgnoreCase(request.getMethod())) {
            return false;
        }
        return normalizedPath(request).matches("/api/tickets/\\d+");
    }

    private static String normalizedPath(HttpServletRequest request) {
        String uri = request.getRequestURI();
        String context = request.getContextPath();
        if (context != null && !context.isEmpty() && uri.startsWith(context)) {
            uri = uri.substring(context.length());
        }
        if (uri.length() > 1 && uri.endsWith("/")) {
            uri = uri.substring(0, uri.length() - 1);
        }
        return uri;
    }
}
