package org.app.authservice.service;

import org.app.authservice.dto.request.RegisterRequest;
import org.app.authservice.entity.User;
import org.app.authservice.repository.UserRepository;
import org.app.authservice.service.impl.AuthServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthRegistrationSecurityTest {
    @Mock UserRepository users;
    @Mock PasswordEncoder passwords;
    @InjectMocks AuthServiceImpl service;

    @Test void registrationCannotSetPasswordOnExistingGoogleAccount() {
        User googleUser = User.builder().id(7L).email("owner@example.com").googleSub("google-user").build();
        when(users.findByEmail("owner@example.com")).thenReturn(Optional.of(googleUser));
        when(passwords.encode("attacker-password")).thenReturn("encoded");
        RegisterRequest request = new RegisterRequest();
        request.setEmail("owner@example.com");
        request.setPassword("attacker-password");
        assertThrows(IllegalArgumentException.class, () -> service.registerUser(request));
        assertNull(googleUser.getPassword());
        verify(users, never()).save(any());
    }
}
