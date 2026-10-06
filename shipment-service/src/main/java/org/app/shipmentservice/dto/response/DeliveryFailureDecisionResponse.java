package org.app.shipmentservice.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.app.shipmentservice.entity.FailureDecisionType;
import org.app.shipmentservice.entity.ShipmentStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeliveryFailureDecisionResponse {

    private Long id;
    private String trackingCode;
    private Long customerId;
    private int attemptNo;
    private LocalDateTime failedAt;
    private LocalDateTime decisionDeadline;
    private long remainingSeconds;
    private String failureReason;
    private FailureDecisionType decision;
    private LocalDate preferredDate;
    private String decisionNote;
    private String newReceiverPhone;
    private String newReceiverAddress;
    private LocalDateTime decidedAt;
    private LocalDateTime createdAt;

    // Shipment details
    private ShipmentStatus shipmentStatus;
    private String receiverName;
    private String receiverPhone;
    private String receiverAddress;
    private BigDecimal codAmount;
}
