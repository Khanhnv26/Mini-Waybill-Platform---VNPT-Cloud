package org.app.notificationservice.dto.response;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
@JsonIgnoreProperties(ignoreUnknown = true)
public class ReturnRequestResponse {
    private Long id;
    private String trackingCode;
    private String initiator;
    private String reasonCode;
    private String reasonNote;
    private String returnMode;
    private String status;
    private boolean postalFault;
    private BigDecimal returnFee;
    private String feePaymentStatus;
    private String requestedBy;
}
