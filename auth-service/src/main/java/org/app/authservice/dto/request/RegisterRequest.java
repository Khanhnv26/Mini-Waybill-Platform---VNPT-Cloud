package org.app.authservice.dto.request;

import lombok.Data;

@Data
public class RegisterRequest {
    @jakarta.validation.constraints.NotBlank
    @jakarta.validation.constraints.Size(max = 100)
    private String fullName;
    @jakarta.validation.constraints.Email
    @jakarta.validation.constraints.NotBlank
    @jakarta.validation.constraints.Size(max = 255)
    private String email;
    @jakarta.validation.constraints.NotBlank
    @jakarta.validation.constraints.Size(min = 8, max = 72)
    private String password;
}
