package org.app.paymentservice.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.app.paymentservice.entity.PaymentType;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConfirmCashRequest {

    @NotBlank(message = "Mã vận đơn không được để trống")
    private String trackingCode;

    private BigDecimal amount;

    private PaymentType paymentType;

    private String note;
}
