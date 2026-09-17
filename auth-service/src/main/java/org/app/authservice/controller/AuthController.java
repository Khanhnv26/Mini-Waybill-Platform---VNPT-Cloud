package org.app.authservice.controller;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.app.authservice.dto.admin.*;
import org.app.authservice.dto.request.*;
import org.app.authservice.dto.response.AuthResponse;
import org.app.authservice.entity.Permission;
import org.app.authservice.entity.Role;
import org.app.authservice.entity.User;
import org.app.authservice.service.AdminService;
import org.app.authservice.service.AuthService;
import org.app.authservice.service.GoogleVerifyService;
import org.app.authservice.service.JwtService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final GoogleVerifyService googleVerifyService;
    private final AuthService authService;
    private final JwtService jwtService;
    private final AdminService adminService;

    @PostMapping("/google")
    public ResponseEntity<AuthResponse> loginWithGoogle(@RequestBody GoogleLoginRequest loginRequest) throws Exception {
        GoogleIdToken.Payload payload = googleVerifyService.verifyToken(loginRequest.getIdToken());
        User user = authService.processGoogleUser(payload);
        String jwt = jwtService.generateToken(user);
        return ResponseEntity.ok(buildResponse(user, jwt));
    }

    @PostMapping("/google/link")
    public ResponseEntity<AuthResponse> linkGoogle(
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestBody GoogleLoginRequest loginRequest) throws Exception {
        Long userId = resolveUserId(userIdHeader, authHeader);
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        GoogleIdToken.Payload payload = googleVerifyService.verifyToken(loginRequest.getIdToken());
        User user = authService.linkGoogleAccount(userId, payload);
        String jwt = jwtService.generateToken(user);
        return ResponseEntity.ok(buildResponse(user, jwt));
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@RequestBody RegisterRequest registerRequest) {
        User user = authService.registerUser(registerRequest);
        String jwt = jwtService.generateToken(user);
        return ResponseEntity.ok(buildResponse(user, jwt));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody LoginRequest loginRequest) {
        User user = authService.login(loginRequest);
        String jwt = jwtService.generateToken(user);
        return ResponseEntity.ok(buildResponse(user, jwt));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String,String>> forgotPassword(@Valid @RequestBody ForgotPasswordRequest forgotPasswordRequest) {
        authService.forgotPassword(forgotPasswordRequest);
        return ResponseEntity.ok(Map.of(
                "message", "Mã xác thực OTP đã được gửi đến email. Vui lòng kiểm tra hộp thư!"
        ));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<Map<String,String>> resetPassword(@Valid @RequestBody ResetPasswordRequest resetPasswordRequest) {
        authService.resetPassword(resetPasswordRequest);
        return ResponseEntity.ok(Map.of(
                "message", "Đặt lại mật khẩu thành công! Bạn có thể đăng nhập ngay bây giờ."
        ));
    }

    @GetMapping("/me")
    public ResponseEntity<AuthResponse> getMyProfile(
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        Long userId = resolveUserId(userIdHeader, authHeader);
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        User user = authService.getMyProfile(userId);
        String token = (authHeader != null && authHeader.startsWith("Bearer "))
                ? authHeader.substring(7)
                : jwtService.generateToken(user);
        return ResponseEntity.ok(buildResponse(user, token));
    }

    @PutMapping("/me")
    public ResponseEntity<AuthResponse> updateMyProfile(
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @Valid @RequestBody UpdateMyProfileRequest request) {
        Long userId = resolveUserId(userIdHeader, authHeader);
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        User user = authService.updateMyProfile(userId, request);
        String token = jwtService.generateToken(user);
        return ResponseEntity.ok(buildResponse(user, token));
    }

    private Long resolveUserId(String userIdHeader, String authHeader) {
        if (userIdHeader != null && !userIdHeader.isBlank() && !"null".equalsIgnoreCase(userIdHeader)) {
            try {
                return Long.parseLong(userIdHeader.trim());
            } catch (NumberFormatException ignored) {}
        }
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            return jwtService.extractUserId(authHeader.substring(7));
        }
        return null;
    }

    private AuthResponse buildResponse(User user, String jwt) {

        List<String> permissions = user.getRoles() != null ?
                user.getRoles().stream()
                        .filter(role -> role.getPermissions() != null)
                        .flatMap(role -> role.getPermissions().stream())
                        .map(Permission::getCode)
                        .distinct()
                        .toList() : List.of();

        return AuthResponse.builder()
                .accessToken(jwt)
                .tokenType("Bearer")
                .userId(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .avatarUrl(user.getAvatarUrl())
                .locationCode(user.getLocationCode())
                .roles(user.getRoles().stream().map(Role::getName).toList())
                .permissions(permissions)
                .googleLinked(user.getGoogleSub() != null && !user.getGoogleSub().isBlank())
                .build();
    }

}
