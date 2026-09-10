package org.app.trackingservice.dto.event;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class ShipmentStatusUpdatedEvent {
    private String trackingCode;
    private String status;
    private String locationCode;
    private String note;
    private LocalDateTime updatedAt;
}
