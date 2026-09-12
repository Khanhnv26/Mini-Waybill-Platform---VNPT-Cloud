package org.app.routingservice.dto.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@AllArgsConstructor
@NoArgsConstructor
@Builder
@Data
public class TripEvent {
    private String eventType;
    private String tripCode;
    private String currentHub;
    private String nextHub;
    List<String> loadedTrackingCodes;
    List<String> unloadedTrackingCodes;
    List<String> transitTrackingCodes;
    private LocalDateTime occurredAt;
}
