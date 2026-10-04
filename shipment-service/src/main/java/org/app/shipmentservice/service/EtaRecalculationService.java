package org.app.shipmentservice.service;

import org.app.shipmentservice.entity.Shipment;

public interface EtaRecalculationService {

    Shipment recalculateByTrackingCode(String trackingCode);

    int recalculateActiveShipments(int batchSize);
}
