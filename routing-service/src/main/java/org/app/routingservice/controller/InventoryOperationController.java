package org.app.routingservice.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.app.routingservice.dto.operation.HandoffRequest;
import org.app.routingservice.dto.operation.InventoryOperationRequest;
import org.app.routingservice.entity.HandlingEvent;
import org.app.routingservice.entity.WarehouseInventory;
import org.app.routingservice.service.InventoryOperationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/routing")
@RequiredArgsConstructor
public class InventoryOperationController {

    private final InventoryOperationService operationService;

    @PostMapping("/locations/{locationCode}/receive")
    public ResponseEntity<List<WarehouseInventory>> receive(
            @PathVariable String locationCode,
            @Valid @RequestBody InventoryOperationRequest request,
            @RequestHeader(value = "X-User-Id", required = false) String actorId,
            @RequestHeader(value = "X-User-Roles", required = false) String roles,
            @RequestHeader(value = "X-User-Permissions", required = false) String permissions,
            @RequestHeader(value = "X-User-Location-Code", required = false) String actorLocationCode) {
        return ResponseEntity.ok(operationService.receive(locationCode, request, actorId, roles, permissions, actorLocationCode));
    }

    @PostMapping("/locations/{locationCode}/store")
    public ResponseEntity<List<WarehouseInventory>> store(
            @PathVariable String locationCode,
            @Valid @RequestBody InventoryOperationRequest request,
            @RequestHeader(value = "X-User-Id", required = false) String actorId,
            @RequestHeader(value = "X-User-Roles", required = false) String roles,
            @RequestHeader(value = "X-User-Permissions", required = false) String permissions,
            @RequestHeader(value = "X-User-Location-Code", required = false) String actorLocationCode) {
        return ResponseEntity.ok(operationService.store(locationCode, request, actorId, roles, permissions, actorLocationCode));
    }

    @PostMapping("/locations/{locationCode}/handoff")
    public ResponseEntity<WarehouseInventory> handoff(
            @PathVariable String locationCode,
            @Valid @RequestBody HandoffRequest request,
            @RequestHeader(value = "X-User-Id", required = false) String actorId,
            @RequestHeader(value = "X-User-Roles", required = false) String roles,
            @RequestHeader(value = "X-User-Permissions", required = false) String permissions,
            @RequestHeader(value = "X-User-Location-Code", required = false) String actorLocationCode) {
        return ResponseEntity.ok(operationService.handoff(locationCode, request, actorId, roles, permissions, actorLocationCode));
    }

    @GetMapping("/locations/{locationCode}/inventory")
    public ResponseEntity<List<WarehouseInventory>> inventory(
            @PathVariable String locationCode,
            @RequestParam(required = false) String status) {
        return ResponseEntity.ok(operationService.getInventory(locationCode, status));
    }

    @GetMapping("/shipments/{trackingCode}/operations")
    public ResponseEntity<List<HandlingEvent>> operationHistory(@PathVariable String trackingCode) {
        return ResponseEntity.ok(operationService.getOperationHistory(trackingCode));
    }
}
