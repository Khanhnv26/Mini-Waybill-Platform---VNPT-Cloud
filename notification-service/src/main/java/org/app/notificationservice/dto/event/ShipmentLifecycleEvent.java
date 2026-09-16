package org.app.notificationservice.dto.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ShipmentLifecycleEvent {
    private String eventId;
    private String trackingCode;
    private String status;
    private String transportLeg;
    private String operationType;
    private String locationCode;
    private String tripCode;
    private String actorId;
    private String note;
    private LocalDateTime occurredAt;

}
