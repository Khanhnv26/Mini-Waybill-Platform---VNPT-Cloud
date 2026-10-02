package org.app.routingservice.dto.operation;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class StationCapacityDto {
    private String stationCode;
    private int availableCapacity;
    private boolean isOverLoaded;
}
