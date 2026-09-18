package org.app.reportservice.dto.event;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class CreateShipmentEvent {
    private Long id;
    private String trackingCode;
    private Long customerId;
    private String customerEmail;
    private String senderName;
    private String senderPhone;
    private String senderAddress;
    private String receiverName;
    private String receiverPhone;
    private String receiverAddress;
    private String serviceType;
    private Double weight;
    private BigDecimal codAmount;
    private BigDecimal shippingFee;
    private BigDecimal totalFee;
    private String currentStatus;

}
