package org.app.routingservice.dto.event;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
@JsonIgnoreProperties(ignoreUnknown = true)
public class ShipmentStatusUpdatedEvent {
    private String trackingCode;
    private String status;
    private String locationCode;
    private String note;
    private String updateAt;
}
