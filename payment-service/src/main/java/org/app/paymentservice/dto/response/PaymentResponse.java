package org.app.paymentservice.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.app.paymentservice.entity.PaymentMethod;
import org.app.paymentservice.entity.PaymentStatus;
import org.app.paymentservice.entity.PaymentTransaction;
import org.app.paymentservice.entity.PaymentType;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentResponse {

    private String paymentCode;
    private String trackingCode;
    private BigDecimal amount;
    private PaymentType paymentType;
    private PaymentMethod paymentMethod;
    private PaymentStatus status;
    private String qrUrl;
    private String bankCode;
    private String accountNo;
    private String referenceCode;
    private LocalDateTime createdAt;
    private LocalDateTime paidAt;

    public static PaymentResponse from(PaymentTransaction tx) {
        if (tx == null) {
            return null;
        }
        return PaymentResponse.builder()
                .paymentCode(tx.getPaymentCode())
                .trackingCode(tx.getTrackingCode())
                .amount(tx.getAmount())
                .paymentType(tx.getPaymentType())
                .paymentMethod(tx.getPaymentMethod())
                .status(tx.getStatus())
                .qrUrl(tx.getQrUrl())
                .bankCode(tx.getBankCode())
                .accountNo(tx.getAccountNo())
                .referenceCode(tx.getReferenceCode())
                .createdAt(tx.getCreatedAt())
                .paidAt(tx.getPaidAt())
                .build();
    }
}
