package org.app.authservice.service;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import org.app.authservice.entity.User;
import org.springframework.stereotype.Service;


public interface AuthService {
    User processGoogleUser(GoogleIdToken.Payload payload);

}
