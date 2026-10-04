package org.app.shipmentservice.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EtaCalculationResponse {
    private LocalDateTime estimatedDeliveryTime;
    private LocalDateTime estimatedDeliveryMax;
    private String displayDateRange;
    private String displayCommitmentTime;
    private String assignedTripCode;
    private String vehiclePlate;
    private Integer availableVehicleAtOriginHub;
    private Integer availableCapacityAtDest;
    private Boolean isFleetConstrained;

    //leg-aware ETA
    private String currentLeg;
    private Double remainingDistanceKm;
    private String etaBasis;
}
