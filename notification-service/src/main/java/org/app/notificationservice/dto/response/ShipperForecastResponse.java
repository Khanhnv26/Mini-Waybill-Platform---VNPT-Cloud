package org.app.notificationservice.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class ShipperForecastResponse {
    private Long shipperId;
    private String courierCode;
    private String fullName;
    private String assignedZone;
    private String shiftStatus;
    private int estimatedOrdersCount;
    private int maxOrdersPerShift;
    private double utilizationRate;
    private BigDecimal estimatedCodAmount;
}
