package org.app.shipmentservice.entity;

import java.util.Set;

public enum ShipmentStatus {
    CREATED,
    PENDING_ROUTING,
    ROUTE_ASSIGNED,
    ARRIVED_DEST_HUB,
    PICKED_UP,
    IN_TRANSIT,
    OUT_FOR_DELIVERY,
    DELIVERED,
    DELIVERY_FAILED,
    CANCELLED,
    RETURNING,
    OUT_FOR_RETURN,
    RETURNED;

    public boolean canTransitionTo(ShipmentStatus nextStatus) {

        if(nextStatus == null) {
            return false;
        }
        if (this == DELIVERED || this == RETURNED || this == CANCELLED) {
            return false;
        }
        // Cancellation is a terminal business decision and can happen from any
        // non-terminal shipment state, including while a trip is in transit.
        if (nextStatus == CANCELLED) {
            return true;
        }

        switch (this) {
            case CREATED:
                return nextStatus == PENDING_ROUTING;
            case PENDING_ROUTING:
                return nextStatus == ROUTE_ASSIGNED;
            case ROUTE_ASSIGNED:
                return nextStatus == PICKED_UP;
            case PICKED_UP:
                return nextStatus == IN_TRANSIT || nextStatus == RETURNING;
            case IN_TRANSIT:
                return nextStatus == ARRIVED_DEST_HUB || nextStatus == RETURNING;
            case ARRIVED_DEST_HUB:
                return nextStatus == OUT_FOR_DELIVERY || nextStatus == RETURNING;
            case OUT_FOR_DELIVERY:
                return Set.of(DELIVERED, DELIVERY_FAILED, RETURNING).contains(nextStatus);
            case DELIVERED:
                return false;
            case DELIVERY_FAILED:
                return nextStatus == OUT_FOR_DELIVERY || nextStatus == RETURNING;
            case RETURNING:
                return nextStatus == OUT_FOR_RETURN || nextStatus == RETURNED;
            case OUT_FOR_RETURN:
                return nextStatus == RETURNED;
            case CANCELLED:
            case RETURNED:
                return false;
        }
        return false;
    }
}
