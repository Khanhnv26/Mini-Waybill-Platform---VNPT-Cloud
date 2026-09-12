package org.app.sharedevents.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ShipmentLifecycleEvent {

    private String eventId;
    private String trackingCode;
    private String status;
    private TransportLeg transportLeg;
    private OperationType operationType;
    private String locationCode;
    private String tripCode;
    private String actorId;
    private String note;
    private LocalDateTime occurredAt;
}
