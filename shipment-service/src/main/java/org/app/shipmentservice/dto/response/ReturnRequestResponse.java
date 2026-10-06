package org.app.shipmentservice.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.app.shipmentservice.entity.FeePaymentStatus;
import org.app.shipmentservice.entity.ReturnInitiator;
import org.app.shipmentservice.entity.ReturnMode;
import org.app.shipmentservice.entity.ReturnRequestStatus;
import org.app.shipmentservice.entity.ShipmentStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReturnRequestResponse {

    private Long id;
    private String trackingCode;
    private Long customerId;
    private ReturnInitiator initiator;
    private String reasonCode;
    private String reasonNote;
    private ReturnMode returnMode;
    private ReturnRequestStatus status;
    private boolean postalFault;
    private BigDecimal returnFee;
    private FeePaymentStatus feePaymentStatus;
    private LocalDateTime arrivedOriginAt;
    private LocalDateTime pickupDeadline;
    private String requestedBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // Additional shipment projection fields
    private ShipmentStatus shipmentStatus;
    private String senderName;
    private String senderPhone;
    private String senderAddress;
    private String receiverName;
    private String receiverPhone;
    private String receiverAddress;
}
