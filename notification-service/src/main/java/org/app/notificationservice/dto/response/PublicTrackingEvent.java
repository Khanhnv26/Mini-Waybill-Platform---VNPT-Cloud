package org.app.notificationservice.dto.response;

import org.app.notificationservice.dto.event.ShipmentStatusUpdatedEvent;
import java.time.LocalDateTime;

public record PublicTrackingEvent(String trackingCode, String status, String locationCode, LocalDateTime updatedAt) {
    public static PublicTrackingEvent from(ShipmentStatusUpdatedEvent event) {
        return new PublicTrackingEvent(event.getTrackingCode(), event.getStatus(), event.getLocationCode(), event.getUpdatedAt());
    }
}
