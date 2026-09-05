package org.app.shipmentservice.service;

import org.app.shipmentservice.dto.request.CreateShipmentRequest;
import org.app.shipmentservice.entity.Shipment;

import java.util.List;

public interface ShipmentService {

    Shipment createShipment(CreateShipmentRequest request, String currentUserId, String permissions);
    Shipment getShipmentByTrackCode(String trackCode, String currentUserId, String permissions);
    List<Shipment> getShipmentByCustomerId(Long customerId, String currentUserId, String permissions);
}
