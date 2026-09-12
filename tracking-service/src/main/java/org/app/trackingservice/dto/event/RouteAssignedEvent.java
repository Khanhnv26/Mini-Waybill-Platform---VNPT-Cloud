package org.app.trackingservice.dto.event;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
@NoArgsConstructor
@AllArgsConstructor
public class RouteAssignedEvent {
    private String trackingCode;
    private String sourceHub;
    private String destinationHub;
    private String originPostOffice;
    private String destPostOffice;
    private String routeCode;
    private String status;
    private LocalDateTime assignedAt;
}
