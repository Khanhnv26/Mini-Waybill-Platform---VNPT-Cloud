package org.app.routingservice.dto.trip;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@AllArgsConstructor
@NoArgsConstructor
@Builder
@Data
public class CreateTripRequest {

    @NotBlank(message = "Mã chuyến đi không được để trống")
    private String tripCode;

    @NotBlank(message = "Tên tuyến đường không được để trống")
    private String routeName;

    @NotBlank(message = "Biển số xe không được để trống")
    private String vehiclePlate;

    @NotBlank(message = "Tên tài xế không được để trống")
    private String driverName;

    @NotNull(message = "Trọng lượng tối đa không được để trống")
    @DecimalMax(value = "5000.0", message = "Trọng lượng tối đa không được vượt quá 5000")
    private Double maxWeight;

    @NotBlank(message = "Điểm xuất phát không được để trống")
    private String originHub;

    List<String> stopHubCodes;
}
