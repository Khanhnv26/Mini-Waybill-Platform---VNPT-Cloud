package org.app.shipmentservice.service;

import org.app.shipmentservice.dto.request.CreateShipmentRequest;
import org.app.shipmentservice.entity.Shipment;

import java.util.List;

public interface ShipmentService {

    Shipment createShipment(CreateShipmentRequest request);
    Shipment getShipmentByTrackCode(String trackCode);
    List<Shipment> getShipmentByCustomerId(Long customerId);
}
