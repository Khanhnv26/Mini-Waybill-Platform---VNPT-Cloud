package org.app.authservice.service.impl;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import lombok.RequiredArgsConstructor;
import org.app.authservice.dto.event.SendEmailEvent;
import org.app.authservice.dto.request.ForgotPasswordRequest;
import org.app.authservice.dto.request.LoginRequest;
import org.app.authservice.dto.request.RegisterRequest;
import org.app.authservice.dto.request.ResetPasswordRequest;
import org.app.authservice.entity.Role;
import org.app.authservice.entity.User;
import org.app.authservice.repository.RoleRepository;
import org.app.authservice.repository.UserRepository;
import org.app.authservice.service.AuthService;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.Optional;
import java.util.Random;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final StringRedisTemplate redisTemplate;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    @Override
    @Transactional
    public User processGoogleUser(GoogleIdToken.Payload payload) {
        String email = payload.getEmail();
        String name = payload.get("name") != null ? payload.get("name").toString() : email;
        String pictureUrl = payload.get("picture") != null ? payload.get("picture").toString() : null;
        String googleSub = payload.getSubject();

        User user = userRepository.findByEmail(email).map(existingUser -> {
            existingUser.setGoogleSub(googleSub);
            if(existingUser.getAvatarUrl() == null) existingUser.setAvatarUrl(pictureUrl);
            return userRepository.save(existingUser);
        }).orElseGet(() -> {
            Role role = getOrCreateCustomerRole();
            User newUser = User.builder()
                    .email(email)
                    .fullName(name)
                    .avatarUrl(pictureUrl)
                    .googleSub(googleSub)
                    .status("ACTIVE")
                    .roles(Collections.singleton(role))
                    .build();
            return userRepository.save(newUser);
        });
        return user;
    }

    @Override
    @Transactional
    public User registerUser(RegisterRequest registerRequest) {

        String encodedPass = passwordEncoder.encode(registerRequest.getPassword());
        Optional<User> existingOpt = userRepository.findByEmail(registerRequest.getEmail());

        if(existingOpt.isPresent()) {
            User existingUser = existingOpt.get();
            if (existingUser.getPassword() == null) {
                existingUser.setPassword(encodedPass);
                return userRepository.save(existingUser);
            }
            throw new IllegalArgumentException("Email này đã có tài khoản và mật khẩu!");
        }

        Role role = getOrCreateCustomerRole();
        User newUser = User.builder()
                .email(registerRequest.getEmail())
                .fullName(registerRequest.getFullName())
                .password(encodedPass)
                .status("ACTIVE")
                .roles(Collections.singleton(role))
                .build();
        return userRepository.save(newUser);
    }

    @Override
    @Transactional
    public User login(LoginRequest loginRequest) {

        User user = userRepository.findByEmail(loginRequest.getEmail())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy tài khoản với email này!"));

        if (user.getPassword() == null) {
            throw new IllegalArgumentException("Tài khoản này chưa tạo mật khẩu. Vui lòng bấm 'Đăng nhập với Google'!");
        }

        if(!passwordEncoder.matches(loginRequest.getPassword(), user.getPassword())) {
            throw new RuntimeException("Mật khẩu không chính xác!");
        }

        return user;
    }

    @Override
    @Transactional
    public void resetPassword(ResetPasswordRequest resetPasswordRequest) {
        String email = resetPasswordRequest.getEmail().trim();
        String otpKey = "otp:" + email;

        String cachedOtp = redisTemplate.opsForValue().get(otpKey);
        if(cachedOtp == null) {
            throw new RuntimeException("Mã OTP đã hết hạn hoặc không tồn tại. Vui lòng yêu cầu mã mới!");
        }

        if (!cachedOtp.equals(resetPasswordRequest.getOtp().trim())) {
            throw new RuntimeException("Mã OTP không chính xác!");
        }

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy tài khoản với email này: " + email));

        user.setPassword(passwordEncoder.encode(resetPasswordRequest.getNewPassword()));
        userRepository.save(user);
        redisTemplate.delete(otpKey);
    }

    @Override
    @Transactional
    public void forgotPassword(ForgotPasswordRequest forgotPasswordRequest) {
        String email = forgotPasswordRequest.getEmail().trim();

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy tài khoản với email này: " + email));

        //avoid spamm
        String coolDownKey = "otp_cooldown:" + email;
        if (Boolean.TRUE.equals(redisTemplate.hasKey(coolDownKey))) {
            Long expire = redisTemplate.getExpire(coolDownKey, TimeUnit.SECONDS);
            throw new RuntimeException("Vui lòng đợi " + (expire != null ? expire : 60) + " giây trước khi yêu cầu mã mới!");
        }

        String otp = String.format("%06d", new Random().nextInt(1000000));
        String otpKey = "otp:" + email;
        redisTemplate.opsForValue().set(otpKey, otp, 15, TimeUnit.MINUTES);
        redisTemplate.opsForValue().set(coolDownKey, "LOCK", 60, TimeUnit.SECONDS);

        SendEmailEvent sendEmailEvent = SendEmailEvent.builder()
                .toEmail(email)
                .subject("[Mini Waybill] Mã OTP xác nhận đặt lại mật khẩu")
                .body("Chào " + user.getFullName() + ",\n\n"
                        + "Mã OTP xác thực đặt lại mật khẩu của bạn là: " + otp + "\n"
                        + "Mã này có hiệu lực trong vòng 15 phút.\n"
                        + "Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này để bảo vệ tài khoản.")
                .type("FORGOT_PASSWORD_OTP")
                .build();
        kafkaTemplate.send("email-events", sendEmailEvent);

    }

    private Role getOrCreateCustomerRole() {
        return roleRepository.findByName("ROLE_CUSTOMER").orElseGet(() -> roleRepository.save(Role.builder()
                .name("ROLE_CUSTOMER")
                .description("Vai trò mặc định cho người dùng mới")
                .build()));
    }
}
