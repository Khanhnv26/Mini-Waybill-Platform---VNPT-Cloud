package org.app.shipmentservice.service.impl;

import lombok.RequiredArgsConstructor;
import org.app.shipmentservice.dto.request.CreateShipmentRequest;
import org.app.shipmentservice.entity.Shipment;
import org.app.shipmentservice.repository.ShipmentRepository;
import org.app.shipmentservice.service.ShipmentService;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ShipmentServiceImpl implements ShipmentService {
    private final ShipmentRepository shipmentRepository;

    @Override
    public Shipment createShipment(CreateShipmentRequest request) {
        String trackingCode = "WB" + System.currentTimeMillis() + UUID.randomUUID().toString().substring(0, 4).toUpperCase();
        Shipment shipment = Shipment.builder()
                .trackingCode(trackingCode)
                .customerId(request.getCustomerId())
                .senderName(request.getSenderName())
                .senderPhone(request.getSenderPhone())
                .senderAddress(request.getSenderAddress())
                .receiverName(request.getReceiverName())
                .receiverPhone(request.getReceiverPhone())
                .receiverAddress(request.getReceiverAddress())
                .serviceType(request.getServiceType())
                .weight(request.getWeight())
                .codAmount(request.getCodAmount())
                .build();
        return shipmentRepository.save(shipment);
    }

    @Override
    public Shipment getShipmentByTrackCode(String trackCode) {
        return shipmentRepository.findShipmentByTrackingCode(trackCode).orElseThrow(
                () -> new RuntimeException("Shipment not found with tracking code: " + trackCode));

    }

    @Override
    public List<Shipment> getShipmentByCustomerId(Long customerId) {
        return shipmentRepository.findAllByCustomerId(customerId).orElseThrow(
                () -> new RuntimeException("Shipment not found with customer ID: " + customerId));
    }
}
