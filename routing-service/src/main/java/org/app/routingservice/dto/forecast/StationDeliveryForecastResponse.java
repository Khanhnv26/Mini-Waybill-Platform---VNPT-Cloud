package org.app.routingservice.dto.forecast;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StationDeliveryForecastResponse {
    private String stationCode;
    private String stationName;
    private String parentHubCode;
    private String forecastDate;
    private LocalDateTime calculatedAt;
    private ForecastSummaryDto summary;
    private StationCapacityForecastDto capacity;
    private List<ShipperForecastDto> shipperAllocations;
    private List<ZoneForecastDto> zoneBreakdown;
}
