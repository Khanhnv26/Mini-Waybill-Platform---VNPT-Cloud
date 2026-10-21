package org.app.authservice.service;

import org.app.authservice.dto.request.DesktopSessionCompleteRequest;
import org.app.authservice.dto.response.AuthResponse;
import org.app.authservice.dto.response.DesktopSessionInitResponse;
import org.app.authservice.dto.response.DesktopSessionStatusResponse;

public interface DesktopAuthSessionService {
    DesktopSessionInitResponse initSession(String clientOrigin);
    DesktopSessionStatusResponse getSessionStatus(String sessionId);
    AuthResponse completeSession(DesktopSessionCompleteRequest request) throws Exception;
}
