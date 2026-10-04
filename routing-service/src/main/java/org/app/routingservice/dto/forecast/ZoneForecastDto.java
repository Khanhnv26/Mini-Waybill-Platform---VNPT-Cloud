package org.app.routingservice.dto.forecast;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ZoneForecastDto {
    private String zoneName;
    private int ordersCount;
    private String assignedCourierCode;
    private String assignedCourierName;
}
