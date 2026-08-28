package org.app.shipmentservice.dto.event;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.app.shipmentservice.entity.ServiceType;
import org.app.shipmentservice.entity.ShipmentStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@AllArgsConstructor
@NoArgsConstructor
@Builder
@Data
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

    private ServiceType serviceType;


    private Double weight;


    private BigDecimal codAmount;

    private ShipmentStatus currentStatus;


}
