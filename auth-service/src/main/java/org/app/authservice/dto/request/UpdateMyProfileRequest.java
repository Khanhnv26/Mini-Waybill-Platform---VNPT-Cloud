package org.app.authservice.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateMyProfileRequest {

    @NotBlank(message = "Họ và tên không được để trống")
    private String fullName;

    private String avatarUrl;
}
