package org.app.sharedevents.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentSuccessEvent {

    private String eventId;
    private String paymentCode;
    private String trackingCode;
    private BigDecimal amount;
    private String paymentType;
    private String paymentMethod;
    private String referenceCode;
    private String payerNote;
    private LocalDateTime paidAt;
}
