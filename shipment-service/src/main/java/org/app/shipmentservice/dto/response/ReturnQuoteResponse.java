package org.app.shipmentservice.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.app.shipmentservice.entity.ReturnMode;
import org.app.shipmentservice.entity.ShipmentStatus;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReturnQuoteResponse {

    private String trackingCode;
    private ShipmentStatus currentStatus;
    private boolean canReturn;
    private String reason;
    private BigDecimal originalShippingFee;
    private BigDecimal estimatedReturnFee;
    private BigDecimal codAmount;
    private boolean codWillBeVoided;
    private ReturnMode defaultReturnMode;
    private String senderAddress;
    private String senderName;
    private String senderPhone;
}
