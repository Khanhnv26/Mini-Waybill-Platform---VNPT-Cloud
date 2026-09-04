package org.app.authservice.service.impl;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import org.app.authservice.service.GoogleVerifyService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.Collections;

@Service
public class GoogleVerifyServiceImpl implements GoogleVerifyService {

    private final GoogleIdTokenVerifier verifier;

    public GoogleVerifyServiceImpl(@Value("${app.google.client-id}") String googleClientId) {
        this.verifier = new GoogleIdTokenVerifier.Builder(
                new NetHttpTransport(),
                GsonFactory.getDefaultInstance()
        )
                .setAudience(Collections.singletonList(googleClientId))
                .build();
    }

    @Override
    public GoogleIdToken.Payload verifyToken(String idTokenString) throws Exception {
        try {
            GoogleIdToken idToken = verifier.verify(idTokenString);
            if(idToken == null) {
                throw new Exception("Invalid ID token");
            }
            return idToken.getPayload();
        } catch (Exception e) {
            throw new Exception("Failed to verify ID token: " + e.getMessage());
        }
    }
}
