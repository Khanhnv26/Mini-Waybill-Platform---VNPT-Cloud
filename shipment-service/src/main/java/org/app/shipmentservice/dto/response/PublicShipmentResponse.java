package org.app.shipmentservice.dto.response;

import org.app.shipmentservice.entity.Shipment;
import org.app.shipmentservice.entity.ShipmentStatus;
import org.app.shipmentservice.entity.ServiceType;
import java.time.LocalDateTime;

public record PublicShipmentResponse(String trackingCode, ShipmentStatus currentStatus, ServiceType serviceType,
        LocalDateTime createdAt, LocalDateTime estimatedDeliveryAt, LocalDateTime estimatedDeliveryMax) {
    public static PublicShipmentResponse from(Shipment shipment) {
        return new PublicShipmentResponse(shipment.getTrackingCode(), shipment.getCurrentStatus(), shipment.getServiceType(),
                shipment.getCreatedAt(), shipment.getEstimatedDeliveryAt(), shipment.getEstimatedDeliveryMax());
    }
}
