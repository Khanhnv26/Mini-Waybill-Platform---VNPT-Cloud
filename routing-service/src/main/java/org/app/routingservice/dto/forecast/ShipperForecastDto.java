package org.app.routingservice.dto.forecast;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ShipperForecastDto {
    private Long shipperId;
    private String courierCode;
    private String fullName;
    private String phone;
    private String assignedZone;
    private String shiftStatus;
    private int estimatedOrdersCount;
    private int maxOrdersPerShift;
    private double utilizationRate;
    private BigDecimal estimatedCodAmount;
    private boolean hasLinkedTelegram;
    private String telegramChatId;
}
