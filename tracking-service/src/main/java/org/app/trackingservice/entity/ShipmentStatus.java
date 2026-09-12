package org.app.trackingservice.entity;

import java.util.Set;

public enum ShipmentStatus {
    CREATED,
    PENDING_ROUTING,
    ROUTE_ASSIGNED,
    PICKED_UP,
    IN_TRANSIT,
    ARRIVED_DEST_HUB,
    OUT_FOR_DELIVERY,
    DELIVERED,
    DELIVERY_FAILED,
    CANCELLED,
    RETURNING,
    RETURNED;

    public boolean canTransitionTo(ShipmentStatus nextStatus) {
        
        if(nextStatus == null) {
            return false;
        }

        switch (this) {
            case CREATED:
                return Set.of(PENDING_ROUTING, CANCELLED).contains(nextStatus);
            case PENDING_ROUTING:
                return Set.of(ROUTE_ASSIGNED, CANCELLED).contains(nextStatus);
            case ROUTE_ASSIGNED:
                return nextStatus == PICKED_UP;
            case PICKED_UP:
                return nextStatus == IN_TRANSIT;
            case IN_TRANSIT:
                return nextStatus == ARRIVED_DEST_HUB;
            case ARRIVED_DEST_HUB:
                return nextStatus == OUT_FOR_DELIVERY;
            case OUT_FOR_DELIVERY:
                return Set.of(DELIVERED, DELIVERY_FAILED).contains(nextStatus);
            case DELIVERY_FAILED:
                return Set.of(OUT_FOR_DELIVERY, RETURNING).contains(nextStatus);
            case RETURNING:
                return nextStatus == RETURNED;
            case RETURNED, CANCELLED, DELIVERED:
                return false;
        }
        return false;
    }
}
