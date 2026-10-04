package org.app.routingservice.dto.eta;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class EtaCalculationResponse {

    //display for customer
    private LocalDateTime estimatedDeliveryTime;
    private LocalDateTime estimatedDeliveryMax;
    private String displayDateRange;
    private String displayCommitmentTime;

    //display for staff
    private String assignedTripCode;
    private String vehiclePlate;
    private Integer availableVehicleAtOriginHub;
    private Integer activeShippersAtDest;
    private Integer availableCapacityAtDest;
    private Boolean isFleetConstrained;

    //leg-aware ETA
    private String currentLeg;
    private Double remainingDistanceKm;
    private String etaBasis;

}
