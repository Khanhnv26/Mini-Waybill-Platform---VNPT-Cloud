package org.app.routingservice.dto.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;


@AllArgsConstructor
@NoArgsConstructor
@Data
@Builder
public class CreateShipmentEvent {

    private Long id;
    private String trackingCode;
    private Long customerId;
    private String senderName;
    private String senderPhone;
    private String senderAddress;
    private String receiverName;
    private String receiverPhone;
    private String receiverAddress;
    private String serviceType;
    private Double weight;
    private BigDecimal codAmount;
    private String currentStatus;
}
