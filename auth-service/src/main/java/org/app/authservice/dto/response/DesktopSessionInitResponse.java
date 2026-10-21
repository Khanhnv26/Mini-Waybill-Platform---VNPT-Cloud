package org.app.authservice.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class DesktopSessionInitResponse {
    private String sessionId;
    private Long expiresInSeconds;
    private String loginUrl;
}
