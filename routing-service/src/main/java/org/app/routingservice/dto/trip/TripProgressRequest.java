package org.app.routingservice.dto.trip;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TripProgressRequest {
    private String locationCode;

    @DecimalMin(value = "-90.0", message = "Vĩ độ không hợp lệ")
    @DecimalMax(value = "90.0", message = "Vĩ độ không hợp lệ")
    private Double latitude;

    @DecimalMin(value = "-180.0", message = "Kinh độ không hợp lệ")
    @DecimalMax(value = "180.0", message = "Kinh độ không hợp lệ")
    private Double longitude;

    @DecimalMin(value = "0.0", message = "Tiến độ không hợp lệ")
    @DecimalMax(value = "100.0", message = "Tiến độ không hợp lệ")
    private Double progressPercent;

    private String operationId;
    private String note;
}
