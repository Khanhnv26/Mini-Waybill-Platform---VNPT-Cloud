package org.app.sharedevents.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.*;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class TripProgressEvent {
    private String eventId;
    private String tripCode;
    private String locationCode;
    private Double currentLatitude;
    private Double currentLongitude;
    private Double progressPercent;
    private String vehiclePlate;
    private String actorId;
    private String note;
    private LocalDateTime occurredAt;
}
