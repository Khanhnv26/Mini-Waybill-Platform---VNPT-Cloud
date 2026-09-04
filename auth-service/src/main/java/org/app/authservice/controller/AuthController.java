package org.app.authservice.controller;


import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import lombok.RequiredArgsConstructor;
import org.app.authservice.dto.request.LoginRequest;
import org.app.authservice.dto.response.AuthResponse;
import org.app.authservice.entity.Role;
import org.app.authservice.entity.User;
import org.app.authservice.service.AuthService;
import org.app.authservice.service.GoogleVerifyService;
import org.app.authservice.service.JwtService;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final GoogleVerifyService googleVerifyService;
    private final AuthService authService;
    private final JwtService jwtService;

    @PostMapping("/google")
    public ResponseEntity<AuthResponse>loginWithGooogle(@RequestBody LoginRequest loginRequest) throws Exception {
        GoogleIdToken.Payload payload = googleVerifyService.verifyToken(loginRequest.getIdToken());

        User user = authService.processGoogleUser(payload);
        String jwt = jwtService.generateToken(user);

        AuthResponse response = AuthResponse.builder()
                .accessToken(jwt)
                .tokenType("Bearer")
                .userId(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .avatarUrl(user.getAvatarUrl())
                .roles(user.getRoles().stream().map(Role::getName).toList())
                .build();

        return ResponseEntity.ok(response);
    }
}
