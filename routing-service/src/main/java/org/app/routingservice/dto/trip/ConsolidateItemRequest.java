package org.app.routingservice.dto.trip;


import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@AllArgsConstructor
@NoArgsConstructor
@Data
@Builder
public class ConsolidateItemRequest {

    @NotBlank(message = "Mã vận đơn không được để trống")
    private String trackingCode;

    @NotBlank(message = "Hub xuất phát không được để trống")
    private String originHub;

    @NotBlank(message = "Hub đích không được để trống")
    private String destinationHub;

    @DecimalMin(value = "0.0", inclusive = false, message = "Trọng lượng phải lớn hơn 0")
    private Double weight;

    private String serviceType;


}
