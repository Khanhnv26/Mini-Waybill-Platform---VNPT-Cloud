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
public class ForecastSummaryDto {
    private int totalForecastOrders;
    private int inTransitCount;
    private int inventoryHeldCount;
    private int committedEtaCount;
    private double estimatedWeightKg;
    private BigDecimal estimatedCodAmount;
}
