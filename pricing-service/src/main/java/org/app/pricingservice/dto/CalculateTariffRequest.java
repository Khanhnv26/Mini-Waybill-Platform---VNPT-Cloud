package org.app.pricingservice.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CalculateTariffRequest {

    @NotBlank(message = "Tỉnh/thành người gửi không được để trống")
    private String senderProvince;

    private String senderDistrict;

    @NotBlank(message = "Tỉnh/thành người nhận không được để trống")
    private String receiverProvince;

    private String receiverDistrict;

    @NotNull(message = "Khối lượng gram không được để trống")
    @DecimalMin(value = "1.0", message = "Khối lượng phải lớn hơn 0")
    private Double weightGram;

    private Double lengthCm;

    private Double widthCm;

    private Double heightCm;

    private BigDecimal codAmount;

    private BigDecimal declaredValue;
}
