package org.app.authservice.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class DesktopSessionCompleteRequest {
    @NotBlank(message = "Session ID không được để trống")
    private String sessionId;
    private String idToken;
}
