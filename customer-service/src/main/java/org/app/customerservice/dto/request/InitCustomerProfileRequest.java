package org.app.customerservice.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InitCustomerProfileRequest {

    @NotNull(message = "User ID không được để trống")
    private Long userId;

    @NotBlank(message = "Email không được để trống")
    private String email;

    @NotBlank(message = "Họ và tên không được để trống")
    private String fullName;
}
