package org.app.shipmentservice.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.app.shipmentservice.entity.ReturnMode;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateReturnRequestDto {

    @NotBlank(message = "Lý do hoàn không được để trống")
    private String reasonCode;

    private String reasonNote;

    @NotNull(message = "Hình thức nhận hàng hoàn không được để trống")
    private ReturnMode returnMode;
}
