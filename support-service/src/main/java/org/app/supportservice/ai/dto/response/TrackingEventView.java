package org.app.supportservice.ai.dto.response;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class TrackingEventView {
    private String status;
    private String locationCode;
    private String node;
    private LocalDateTime occurredAt;
}
