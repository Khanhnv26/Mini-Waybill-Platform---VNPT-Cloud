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
    public ResponseEntity<?> getShipmentByCode(
            @PathVariable("code") String code,
            @RequestHeader(value = "X-User-Id", required = false) String currentUserId,
            @RequestHeader(value = "X-User-Permissions",required = false) String permissions,
            @RequestHeader(value = "X-Gateway-Request", required = false) String gatewayRequest) {
        Shipment shipment = shipmentService.getShipmentByTrackCode(code, currentUserId, permissions);
        if (gatewayRequest != null && !shipmentService.canViewDetails(shipment, currentUserId, permissions)) {
            return ResponseEntity.ok(org.app.shipmentservice.dto.response.PublicShipmentResponse.from(shipment));
        }
        return ResponseEntity.ok(shipment);
    }

    @GetMapping
    public ResponseEntity<List<Shipment>> getAllShipments(@RequestParam(name = "customerId", required = false) Long customerId,
                                                          @RequestHeader(value = "X-User-Id", required = false) String currentUserId,
                                                          @RequestHeader(value = "X-User-Permissions",required = false) String permissions) {
        List<Shipment> shipments = shipmentService.getShipments(customerId, currentUserId, permissions);
        return ResponseEntity.ok(shipments);
    }

    @GetMapping("/page")
    public ResponseEntity<org.app.shipmentservice.dto.response.ShipmentPageResponse> getPage(
            @RequestParam(required = false) Long customerId,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String keyword, @RequestParam(required = false) String status,
            @RequestHeader(value = "X-User-Id", required = false) String userId,
            @RequestHeader(value = "X-User-Permissions", required = false) String permissions) {
        return ResponseEntity.ok(shipmentService.getShipmentPage(customerId, userId, permissions, page, size, keyword, status));
    }

    @PostMapping("/{code}/recalculate-eta")
    public ResponseEntity<Shipment> recalculateEta(@PathVariable("code") String code) {
        return ResponseEntity.ok(shipmentService.recalculateEta(code));
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
            @RequestHeader(value = "X-User-Id", required = false) String currentUserId,
            @RequestHeader(value = "X-User-Roles", required = false) String roles) {
        requireRole(currentUserId, roles, "ADMIN", "SHIPPER");
        String courier = userEmail != null && !userEmail.isBlank() ? userEmail : currentUserId;
        List<String> codes = (request != null) ? request.getTrackingCodes() : null;
        List<Shipment> result = shipmentService.submitCodSettlement(codes, courier);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/cod/confirm-settlement")
    public ResponseEntity<List<Shipment>> confirmCodSettlement(
            @RequestBody CodSettlementRequest request,
            @RequestHeader(value = "X-User-Email", required = false) String userEmail,
            @RequestHeader(value = "X-User-Id", required = false) String currentUserId,
            @RequestHeader(value = "X-User-Roles", required = false) String roles) {
        requireRole(currentUserId, roles, "ADMIN", "POST_OFFICE_OPERATOR", "POST_OFFICE_STAFF");
        String officer = userEmail != null && !userEmail.isBlank() ? userEmail : currentUserId;
        List<String> codes = (request != null) ? request.getTrackingCodes() : null;
        List<Shipment> result = shipmentService.confirmCodSettlement(codes, officer);
        return ResponseEntity.ok(result);
    }

    private void requireRole(String userId, String roles, String... allowed) {
        if (userId == null || userId.isBlank() || !org.app.sharedevents.security.RoleAccess.hasAny(roles, allowed)) {
            throw new org.springframework.web.server.ResponseStatusException(HttpStatus.FORBIDDEN);
        }
    }
}
