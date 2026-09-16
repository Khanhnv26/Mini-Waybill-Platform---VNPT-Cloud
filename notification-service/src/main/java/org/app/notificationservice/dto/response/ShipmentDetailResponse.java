package org.app.notificationservice.dto.response;


import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
@JsonIgnoreProperties(ignoreUnknown = true)
public class ShipmentDetailResponse {
    private String trackingCode;
    private String receiverName;
    private String receiverPhone;
    private String receiverAddress;
    private BigDecimal codAmount;
    private String serviceType;

}
