package org.app.authservice.service.impl;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import lombok.RequiredArgsConstructor;
import org.app.authservice.entity.Role;
import org.app.authservice.entity.User;
import org.app.authservice.repository.RoleRepository;
import org.app.authservice.repository.UserRepository;
import org.app.authservice.service.AuthService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;

    @Override
    @Transactional
    public User processGoogleUser(GoogleIdToken.Payload payload) {
        String email = payload.getEmail();
        String name = payload.get("name").toString();
        String pictureUrl = payload.get("picture").toString();
        String googleSub = payload.getSubject();

        User user = userRepository.findByEmail(email).map(existingUser -> {
            existingUser.setFullName(name);
            existingUser.setAvatarUrl(pictureUrl);
            existingUser.setGoogleSub(googleSub);
            return existingUser;
        }).orElseGet(() -> {

            Role role  = roleRepository.findByName("ROLE_CUSTOMER").orElseGet(() -> roleRepository.save(Role.builder()
                        .name("ROLE_CUSTOMER")
                        .description("Default role for new users")
                        .build()));

            User newUser = User.builder()
                    .email(email)
                    .fullName(name)
                    .avatarUrl(pictureUrl)
                    .googleSub(googleSub)
                    .roles(Collections.singleton(role))
                    .build();
            return userRepository.save(newUser);
        });
    return userRepository.save(user);
    }
}
