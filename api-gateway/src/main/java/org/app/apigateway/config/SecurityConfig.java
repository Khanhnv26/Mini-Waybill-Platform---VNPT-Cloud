package org.app.apigateway.config;

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

        // tắt csrf vì không cookie mà jwt
        return http.csrf(AbstractHttpConfigurer::disable)
                   .cors(Customizer.withDefaults()) // nhập cấu hình cors.config
                   .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        //cho di qua tinh nang danh nhap lay lai mat khau
                        .requestMatchers(
                        "/api/auth/login",
                        "/api/auth/register",
                        "/api/auth/google",
                        "/api/auth/forgot-password",
                        "/api/auth/reset-password").permitAll()
                        //khach hang vang lai xem thong tin don hang tra cuu
                        .requestMatchers(HttpMethod.GET,"/api/tracking/**").permitAll()
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")
                        .requestMatchers("/api/audits/**").hasAnyRole("CS", "ADMIN")
                        .anyRequest().authenticated())
                        .addFilterBefore(jwtAuthenticationFilter,UsernamePasswordAuthenticationFilter.class)
                        .build();

    }
}
