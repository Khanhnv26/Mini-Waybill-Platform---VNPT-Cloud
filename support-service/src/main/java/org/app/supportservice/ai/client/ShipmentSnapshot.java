package org.app.supportservice.ai.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

import java.math.BigDecimal;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class ShipmentSnapshot {
    private String trackingCode;
    private String currentStatus;
    private String receiverName;
    private String receiverAddress;
    private BigDecimal codAmount;
    private String serviceType;
    private Double weight;
}
