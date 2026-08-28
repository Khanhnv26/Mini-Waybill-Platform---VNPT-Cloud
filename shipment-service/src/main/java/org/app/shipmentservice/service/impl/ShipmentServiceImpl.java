package org.app.shipmentservice.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.app.shipmentservice.client.CustomerClient;
import org.app.shipmentservice.dto.request.CreateShipmentRequest;
import org.app.shipmentservice.dto.response.CustomerValidationResponse;
import org.app.shipmentservice.entity.Shipment;
import org.app.shipmentservice.repository.ShipmentRepository;
import org.app.shipmentservice.service.ShipmentService;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ShipmentServiceImpl implements ShipmentService {
    private final ShipmentRepository shipmentRepository;
    private final CustomerClient customerClient;

    @Override
    public Shipment createShipment(CreateShipmentRequest request) {

        log.info("Đang gọi service customer để xác thực thông tin khách hàng {}",request.getCustomerId());
        CustomerValidationResponse validationResponse = customerClient.validateCustomer(request.getCustomerId());
        if (validationResponse == null || !validationResponse.isValid()) {
            throw new RuntimeException("Không xác thực được khách hàng !" +
                    " Lí do: " + (validationResponse != null ? validationResponse.getReason() : "Unknown"));
        }

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

        CustomerValidationResponse validationResponse = customerClient.validateCustomer(customerId);
        if (validationResponse == null || !validationResponse.isValid()) {
            throw new RuntimeException("Không xác thực được khách hàng !" +
                    " Lí do: " + (validationResponse != null ? validationResponse.getReason() : "Unknown"));
        }

        return shipmentRepository.findAllByCustomerId(customerId).orElseThrow(
                () -> new RuntimeException("Shipment not found with customer ID: " + customerId));
    }
}
