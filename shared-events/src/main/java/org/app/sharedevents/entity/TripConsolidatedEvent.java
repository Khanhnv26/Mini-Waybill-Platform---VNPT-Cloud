package org.app.sharedevents.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class TripConsolidatedEvent {
    private Long tripId;
    private String tripCode;
    private Double currentWeight;
    private Double maxWeight;
    private Double loadFactor;
    private Integer totalShipments;
    private Boolean readyToDepart;
    private LocalDateTime occuredAt;
}
