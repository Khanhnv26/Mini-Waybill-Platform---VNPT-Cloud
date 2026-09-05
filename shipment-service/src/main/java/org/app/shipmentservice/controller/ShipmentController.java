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
    public ResponseEntity<Shipment> createShipment(
            @Valid @RequestBody CreateShipmentRequest request,
            @RequestHeader(value = "X-User-Id", required = false) String currentUserId,
            @RequestHeader(value = "X-User-Permissions",required = false) String permissions
    ){

        Shipment shipment = shipmentService.createShipment(request, currentUserId, permissions);
        return ResponseEntity.status(HttpStatus.CREATED).body(shipment);
    }

    @GetMapping("/{code}")
    public ResponseEntity<Shipment> getShipmentByCode(
            @PathVariable("code") String code,
            @RequestHeader(value = "X-User-Id", required = false) String currentUserId,
            @RequestHeader(value = "X-User-Permissions",required = false) String permissions) {
        Shipment shipment = shipmentService.getShipmentByTrackCode(code, currentUserId, permissions);
        return ResponseEntity.ok(shipment);
    }

    @GetMapping
    public ResponseEntity<List<Shipment>> getAllShipments(@RequestParam(name = "customerId") Long customerId,
                                                          @RequestHeader(value = "X-User-Id", required = false) String currentUserId,
                                                          @RequestHeader(value = "X-User-Permissions",required = false) String permissions) {
        List<Shipment> shipments = shipmentService.getShipmentByCustomerId(customerId, currentUserId, permissions);
        return ResponseEntity.ok(shipments);
    }
}
