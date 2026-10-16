package org.app.authservice.service;

import org.app.authservice.dto.request.ResetPasswordRequest;
import org.app.authservice.entity.User;
import org.app.authservice.repository.UserRepository;
import org.app.authservice.service.impl.AuthServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.data.redis.core.script.RedisScript;
import org.springframework.security.crypto.password.PasswordEncoder;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

@ExtendWith(MockitoExtension.class)
class AuthOtpSecurityTest {
    @Mock UserRepository users;
    @Mock StringRedisTemplate redis;
    @Mock ValueOperations<String, String> values;
    @Mock PasswordEncoder encoder;
    @Mock SessionRevocationService sessions;
    @InjectMocks AuthServiceImpl service;

    private ResetPasswordRequest request() {
        ResetPasswordRequest request = new ResetPasswordRequest();
        request.setEmail("OWNER@EXAMPLE.COM"); request.setOtp("012345"); request.setNewPassword("new-password");
        return request;
    }

    @Test void exceedingAttemptLimitInvalidatesOtpBeforeAnyPasswordChange() {
        when(redis.opsForValue()).thenReturn(values);
        when(values.increment("otp_attempts:owner@example.com")).thenReturn(6L);
        assertThrows(IllegalArgumentException.class, () -> service.resetPassword(request()));
        verify(redis).delete("otp:owner@example.com");
        verifyNoInteractions(users, encoder, sessions);
    }

    @Test void alreadyConsumedOtpCannotBeReusedEvenAfterReadingItsPreviousValue() {
        when(redis.opsForValue()).thenReturn(values);
        when(values.increment("otp_attempts:owner@example.com")).thenReturn(2L);
        when(values.get("otp:owner@example.com")).thenReturn("012345");
        when(users.findByEmail("owner@example.com")).thenReturn(Optional.of(User.builder().id(7L).build()));
        when(redis.execute(any(RedisScript.class), anyList(), eq("012345"))).thenReturn(0L);
        assertThrows(IllegalArgumentException.class, () -> service.resetPassword(request()));
        verify(users, never()).save(any());
        verifyNoInteractions(encoder, sessions);
    }
}
