package org.app.shipmentservice.entity;

public enum ShipmentStatus {
    CREATED,
    PENDING_ROUTING,
    ROUTE_ASSIGNED,
    PICKED_UP,
    IN_TRANSIT,
    OUT_FOR_DELIVERY,
    DELIVERED,
    DELIVERY_FAILED

}
