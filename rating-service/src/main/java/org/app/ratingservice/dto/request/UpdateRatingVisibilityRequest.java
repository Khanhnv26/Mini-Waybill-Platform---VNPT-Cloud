package org.app.ratingservice.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateRatingVisibilityRequest {

    @NotNull(message = "Trạng thái ẩn không được để trống")
    private Boolean isHidden;

    @Size(max = 500, message = "Lý do ẩn không được vượt quá 500 ký tự")
    private String reason;
}
