package org.app.authservice.service;

import org.app.authservice.entity.User;
import org.app.authservice.entity.Role;
import org.app.authservice.repository.UserRepository;
import org.app.authservice.service.impl.JwtServiceImpl;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import java.util.Optional;
import java.util.Set;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class SessionRevocationTest {
    @Test void changingUserOrRoleVersionInvalidatesPreviouslyIssuedToken() {
        SessionRevocationService sessions = mock(SessionRevocationService.class);
        UserRepository users = mock(UserRepository.class);
        JwtServiceImpl jwt = new JwtServiceImpl(sessions, users);
        ReflectionTestUtils.setField(jwt, "secretKey", "test-key-only-012345678901234567890123456789012345678901234567890123");
        ReflectionTestUtils.setField(jwt, "expirationTime", 60000L);
        User user = User.builder().id(7L).email("owner@example.com").status("ACTIVE")
                .roles(Set.of(Role.builder().name("ROLE_CUSTOMER").build())).build();
        when(users.findById(7L)).thenReturn(Optional.of(user));
        when(sessions.userVersion(7L)).thenReturn("0");
        when(sessions.roleVersion("ROLE_CUSTOMER")).thenReturn("0");
        String token = jwt.generateToken(user);
        assertEquals(7L, jwt.extractUserId(token));
        when(sessions.userVersion(7L)).thenReturn("changed");
        assertNull(jwt.extractUserId(token));
        when(sessions.userVersion(7L)).thenReturn("0");
        when(sessions.roleVersion("ROLE_CUSTOMER")).thenReturn("changed");
        assertNull(jwt.extractUserId(token));
    }
}
