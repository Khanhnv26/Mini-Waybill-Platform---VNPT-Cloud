package org.app.authservice.dto.admin;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class RoleDetailResponse {

    private Long id;
    private String name;
    private String description;
    private List<String> permissions;
}
