package org.app.authservice.dto.admin;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class UserAdminResponse {
    private Long id;
    private String email;
    private String fullName;
    private String status;
    private List<String> roles;
    private LocalDateTime createdAt;
}
