package org.app.authservice.dto.admin;

import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class UpdateUserLocationRequest {
    /**
     * A concrete POST-* or HUB-* station code. Null/blank clears the
     * assignment so the account cannot perform station-scoped operations.
     */
    @Size(max = 50)
    private String locationCode;
}
