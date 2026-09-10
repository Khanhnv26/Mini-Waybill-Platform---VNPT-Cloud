package org.app.routingservice.dto.trip;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class EligibleAssignmentResponse {
    private String trackingCode;
    private String sourceHub;
    private String destinationHub;
    private Double weight;
    private String serviceType;
    private LocalDateTime assignedAt;
}
