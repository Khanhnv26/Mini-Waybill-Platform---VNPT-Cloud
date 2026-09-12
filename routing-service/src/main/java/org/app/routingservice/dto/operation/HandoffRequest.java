package org.app.routingservice.dto.operation;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HandoffRequest {
    @NotBlank(message = "Mã bưu gửi không được để trống")
    private String trackingCode;
    @NotBlank(message = "Mã bưu tá không được để trống")
    private String courierId;
    private String operationId;
    private String note;
}
