package org.app.routingservice.dto.forecast;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StationCapacityForecastDto {
    private int totalShippers;
    private int activeShippersOnDuty;
    private int totalShiftCapacity;
    private double utilizationRate;
    private String capacityStatus;
    private String alertMessage;
}
