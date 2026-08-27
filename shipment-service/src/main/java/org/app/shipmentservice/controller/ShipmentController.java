package org.app.shipmentservice.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.app.shipmentservice.dto.request.CreateShipmentRequest;
import org.app.shipmentservice.entity.Shipment;
import org.app.shipmentservice.service.ShipmentService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/shipments")
@RequiredArgsConstructor
public class ShipmentController {

    private final ShipmentService shipmentService;

    @PostMapping
    public ResponseEntity<Shipment> createShipment(@Valid @RequestBody CreateShipmentRequest request) {
        Shipment shipment = shipmentService.createShipment(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(shipment);
    }

    @GetMapping("/{code}")
    public ResponseEntity<Shipment> getShipmentByCode(@PathVariable("code") String code) {
        Shipment shipment = shipmentService.getShipmentByTrackCode(code);
        return ResponseEntity.ok(shipment);
    }

    @GetMapping
    public ResponseEntity<List<Shipment>> getAllShipments(@RequestParam(name = "customerId") Long customerId) {
        List<Shipment> shipments = shipmentService.getShipmentByCustomerId(customerId);
        return ResponseEntity.ok(shipments);
    }
}
