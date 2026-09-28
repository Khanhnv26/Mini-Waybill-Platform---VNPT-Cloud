package org.app.paymentservice.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WebhookPayloadDto {

    private String gatewayName;
    private String referenceCode;
    private BigDecimal amount;
    private String content;
    private String signature;
    private String transferTime;
    private String bankCode;
    private String accountNo;
}
