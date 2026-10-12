package org.app.paymentservice.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.app.paymentservice.entity.PaymentMethod;
import org.app.paymentservice.entity.PaymentStatus;
import org.app.paymentservice.entity.PaymentType;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentFilterRequest {
    private String keyword;
    private PaymentStatus status;
    private PaymentType paymentType;
    private PaymentMethod paymentMethod;
    private String customerCode;
    private LocalDateTime fromDate;
    private LocalDateTime toDate;
    @Builder.Default
    private int page = 0;
    @Builder.Default
    private int size = 20;
}
