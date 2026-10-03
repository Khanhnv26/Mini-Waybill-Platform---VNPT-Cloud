package org.app.routingservice.dto.vehicle;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@AllArgsConstructor
@NoArgsConstructor
@Data
@Builder
public class CreateVehicleRequest {
    @NotBlank(message = "Biển số xe không được để trống")
    private String vehiclePlate;

    @NotBlank(message = "Tên dòng xe không được để trống")
    private String modelName;

    @NotBlank(message = "Loại xe không được để trống")
    private String vehicleType;

    @NotNull(message = "Tải trọng không được để trống")
    @Positive(message = "Tải trọng phải lớn hơn 0")
    private Double payloadCapacity;

    @NotBlank(message = "Hub hiện tại không được để trống")
    private String currentHub;

    private String assignedDriverName;
    private String driverPhone;
}
