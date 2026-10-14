package org.app.authservice.config;

import org.app.authservice.entity.Role;
import org.app.authservice.entity.User;
import org.app.authservice.repository.UserRepository;
import org.app.authservice.service.JwtService;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import jakarta.servlet.FilterChain;
import java.util.Optional;
import java.util.Set;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AdminAuthorizationFilterTest {
    @Test void spoofedIdentityHeadersDoNotAuthenticateDirectAdminRequests() throws Exception {
        JwtService jwt = mock(JwtService.class);
        UserRepository users = mock(UserRepository.class);
        AdminAuthorizationFilter filter = new AdminAuthorizationFilter(jwt, users);
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/admin/users");
        request.setServletPath("/api/admin/users");
        request.addHeader("X-User-Id", "1"); request.addHeader("X-User-Roles", "ROLE_ADMIN");
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);
        filter.doFilter(request, response, chain);
        assertEquals(401, response.getStatus());
        verifyNoInteractions(users, chain);
    }

    @Test void validCustomerJwtDoesNotGrantAdminAccess() throws Exception {
        JwtService jwt = mock(JwtService.class);
        UserRepository users = mock(UserRepository.class);
        when(jwt.extractUserId("signed-token")).thenReturn(7L);
        when(users.findById(7L)).thenReturn(Optional.of(User.builder().roles(
                Set.of(Role.builder().name("ROLE_CUSTOMER").build())).build()));
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/admin/users");
        request.setServletPath("/api/admin/users"); request.addHeader("Authorization", "Bearer signed-token");
        MockHttpServletResponse response = new MockHttpServletResponse();
        new AdminAuthorizationFilter(jwt, users).doFilter(request, response, mock(FilterChain.class));
        assertEquals(403, response.getStatus());
    }
}
