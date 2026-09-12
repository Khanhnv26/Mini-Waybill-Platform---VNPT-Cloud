package org.app.sharedevents.entity;

public enum OperationType {
    SHIPMENT_CREATED,
    ROUTE_ASSIGNED,

    RECEIVED_AT_POST_OFFICE,
    STORED,
    RESERVED_FOR_TRIP,

    LOADED,
    DEPARTED,
    ARRIVED,
    UNLOADED,
    STORED_AT_HUB,

    HANDED_TO_COURIER,

    DELIVERED,
    DELIVERY_FAILED,
    CANCELLED,
    RETURNING,
    RETURNED
}