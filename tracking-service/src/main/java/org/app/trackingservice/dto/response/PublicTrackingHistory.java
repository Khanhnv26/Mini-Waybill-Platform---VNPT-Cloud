package org.app.trackingservice.dto.response;

import org.app.trackingservice.entity.TrackingHistory;
import java.time.LocalDateTime;

public record PublicTrackingHistory(String trackingCode, String status, String locationCode,
                                   String node, LocalDateTime occurredAt) {
    public static PublicTrackingHistory from(TrackingHistory history) {
        return new PublicTrackingHistory(history.getTrackingCode(), history.getStatus(), history.getLocationCode(),
                history.getLocationCode(), history.getOccurredAt());
    }
}
