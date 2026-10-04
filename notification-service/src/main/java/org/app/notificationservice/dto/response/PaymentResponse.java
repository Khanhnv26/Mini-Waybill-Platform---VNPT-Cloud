package org.app.notificationservice.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class PaymentResponse {
    private String paymentCode;
    private String trackingCode;
    private BigDecimal amount;
    private String paymentType;
    private String paymentMethod;
    private String status;
    private String qrUrl;
    private String bankCode;
    private String accountNo;
    private String referenceCode;
    private LocalDateTime createdAt;
    private LocalDateTime paidAt;
}