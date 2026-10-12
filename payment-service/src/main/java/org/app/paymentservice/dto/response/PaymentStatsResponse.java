package org.app.paymentservice.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentStatsResponse {

    private BigDecimal totalCodSuccess;
    private BigDecimal totalShippingFeeSuccess;
    private BigDecimal totalCodPending;
    private long pendingCount;
    private long successCount;
    private long totalCount;
}
