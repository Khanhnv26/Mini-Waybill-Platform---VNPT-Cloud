package org.app.routingservice.dto.vehicle;

import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class UpdateVehicleRequest {
    private String modelName;
    private String vehicleType;

    @Positive(message = "Tải trọng phải lớn hơn 0")
    private Double payloadCapacity;

    private String currentHub;
    private String status;
    private String assignedDriverName;
    private String driverPhone;
}
