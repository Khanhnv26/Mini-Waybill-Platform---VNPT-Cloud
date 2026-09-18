package org.app.apigateway.config;

import jakarta.servlet.DispatcherType;
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
                        .requestMatchers(HttpMethod.GET,"/api/notifications/*").permitAll()
                        .requestMatchers(HttpMethod.GET,"/api/routing/hubs").permitAll()
                        .requestMatchers(HttpMethod.GET,"/api/routing/shipments/**").permitAll()
                        .requestMatchers(HttpMethod.GET,"/api/reports/**").permitAll()
                        .requestMatchers("/api/admin", "/api/admin/**").hasRole("ADMIN")
                        .requestMatchers("/api/audits", "/api/audits/**").hasAnyRole("CS", "ADMIN")
                        .requestMatchers(HttpMethod.GET, "/api/shippers", "/api/shippers/**").hasAnyRole("ADMIN", "POST_OFFICE_OPERATOR", "POST_OFFICE_STAFF", "DISPATCHER")
                        .requestMatchers("/api/shippers", "/api/shippers/**").hasRole("ADMIN")
                        .anyRequest().authenticated())
                        .addFilterBefore(jwtAuthenticationFilter,UsernamePasswordAuthenticationFilter.class)
                        .build();

    }
}
