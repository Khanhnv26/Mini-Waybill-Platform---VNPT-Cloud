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
                .roles(user.getRoles().stream().map(Role::getName).toList())
                .permissions(permissions)
                .build();
    }

}
