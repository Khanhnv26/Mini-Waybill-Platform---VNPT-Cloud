package org.app.trackingservice.entity;

import java.util.Set;

public enum ShipmentStatus {
    CREATED,
    PENDING_ROUTING,
    ROUTE_ASSIGNED,
    PICKED_UP,
    IN_TRANSIT,
    OUT_FOR_DELIVERY,
    DELIVERED,
    DELIVERY_FAILED;

    public boolean canTransitionTo(ShipmentStatus nextStatus) {
        
        if(nextStatus == null) {
            return false;
        }

        switch (this) {
            case CREATED:
                return nextStatus == PENDING_ROUTING;
            case PENDING_ROUTING:
                return nextStatus == ROUTE_ASSIGNED;
            case ROUTE_ASSIGNED:
                return nextStatus == PICKED_UP;
            case PICKED_UP:
                return nextStatus == IN_TRANSIT;
            case IN_TRANSIT:
                return nextStatus == OUT_FOR_DELIVERY;
            case OUT_FOR_DELIVERY:
                return Set.of(DELIVERED, DELIVERY_FAILED).contains(nextStatus);
            case DELIVERED:
                return false;
            case DELIVERY_FAILED:
                return nextStatus == OUT_FOR_DELIVERY;
        }
        return false;
    }
}
