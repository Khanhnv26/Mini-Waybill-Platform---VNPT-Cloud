package org.app.shipmentservice.service;

import org.app.shipmentservice.dto.request.CreateShipmentRequest;
import org.app.shipmentservice.entity.Shipment;

import org.app.shipmentservice.dto.request.CancelShipmentRequest;

import java.util.List;

public interface ShipmentService {

    Shipment createShipment(CreateShipmentRequest request, String currentUserId, String permissions);
    Shipment getShipmentByTrackCode(String trackCode, String currentUserId, String permissions);
    List<Shipment> getShipmentByCustomerId(Long customerId, String currentUserId, String permissions);
    List<Shipment> getShipments(Long customerId, String currentUserId, String permissions);
    Shipment cancelShipment(String trackCode, String currentUserId, String roles, String permissions, CancelShipmentRequest cancelRequest);

    default Shipment cancelShipment(String trackCode, String currentUserId, String permissions) {
        return cancelShipment(trackCode, currentUserId, null, permissions, null);
    }
}
