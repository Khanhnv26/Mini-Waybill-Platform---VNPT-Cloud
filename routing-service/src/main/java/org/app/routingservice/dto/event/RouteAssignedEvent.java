package org.app.routingservice.dto.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@AllArgsConstructor
@NoArgsConstructor
@Data
@Builder
public class RouteAssignedEvent {

    private String trackingCode;
    private String sourceHub;
    private String destinationHub;
    private String routeCode;
    private String status;
    private LocalDateTime assignedAt;
}
