package org.app.shipperservice.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@AllArgsConstructor
@NoArgsConstructor
@Data
@Builder
public class StationCapacityResponse {
    private String stationCode;
    private int totalShippers;
    private int activeShippersOnDuty;
    private int totalCapacityPerShift;
    private int currentActiveOrders;
    private int availableCapacity;
    private double utilizationRate;
}
