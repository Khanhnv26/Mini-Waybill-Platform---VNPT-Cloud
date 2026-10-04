package org.app.routingservice.dto.vehicle;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@AllArgsConstructor
@NoArgsConstructor
@Data
@Builder
public class VehicleResponse {
    private Long id;
    private String vehiclePlate;
    private String modelName;
    private String vehicleType;
    private Double payloadCapacity;
    private String currentHub;
    private String status;
    private String assignedDriverName;
    private String driverPhone;
    private String createdAt;
}
