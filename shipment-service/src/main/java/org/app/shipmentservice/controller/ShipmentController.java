package org.app.shipmentservice.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.app.shipmentservice.dto.request.CancelShipmentRequest;
import org.app.shipmentservice.dto.request.CodSettlementRequest;
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
    public ResponseEntity<List<Shipment>> getAllShipments(@RequestParam(name = "customerId", required = false) Long customerId,
                                                          @RequestHeader(value = "X-User-Id", required = false) String currentUserId,
                                                          @RequestHeader(value = "X-User-Permissions",required = false) String permissions) {
        List<Shipment> shipments = shipmentService.getShipments(customerId, currentUserId, permissions);
        return ResponseEntity.ok(shipments);
    }

    @PostMapping("/{code}/cancel")
    public ResponseEntity<Shipment> cancelShipment(
            @PathVariable("code") String code,
            @RequestBody(required = false) CancelShipmentRequest cancelRequest,
            @RequestHeader(value = "X-User-Id", required = false) String currentUserId,
            @RequestHeader(value = "X-User-Roles", required = false) String roles,
            @RequestHeader(value = "X-User-Permissions", required = false) String permissions) {
        Shipment shipment = shipmentService.cancelShipment(code, currentUserId, roles, permissions, cancelRequest);
        return ResponseEntity.ok(shipment);
    }

    @PostMapping("/cod/submit-settlement")
    public ResponseEntity<List<Shipment>> submitCodSettlement(
            @RequestBody CodSettlementRequest request,
            @RequestHeader(value = "X-User-Email", required = false) String userEmail,
            @RequestHeader(value = "X-User-Id", required = false) String currentUserId) {
        String courier = (request != null && request.getCourierId() != null && !request.getCourierId().isBlank())
                ? request.getCourierId()
                : (userEmail != null ? userEmail : currentUserId);
        List<String> codes = (request != null) ? request.getTrackingCodes() : null;
        List<Shipment> result = shipmentService.submitCodSettlement(codes, courier);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/cod/confirm-settlement")
    public ResponseEntity<List<Shipment>> confirmCodSettlement(
            @RequestBody CodSettlementRequest request,
            @RequestHeader(value = "X-User-Email", required = false) String userEmail,
            @RequestHeader(value = "X-User-Id", required = false) String currentUserId) {
        String officer = (request != null && request.getOfficerId() != null && !request.getOfficerId().isBlank())
                ? request.getOfficerId()
                : (userEmail != null ? userEmail : "Thủ quỹ bưu cục");
        List<String> codes = (request != null) ? request.getTrackingCodes() : null;
        List<Shipment> result = shipmentService.confirmCodSettlement(codes, officer);
        return ResponseEntity.ok(result);
    }
}
