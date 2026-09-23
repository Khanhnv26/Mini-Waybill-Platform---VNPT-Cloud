package org.app.supportservice.ai.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class TrackingStatusView {
    private String trackingCode;
    private String currentStatus;
    private String locationCode;
}
