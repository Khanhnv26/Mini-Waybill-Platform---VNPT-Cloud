package org.app.routingservice.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.app.routingservice.dto.vehicle.CreateVehicleRequest;
import org.app.routingservice.dto.vehicle.UpdateVehicleRequest;
import org.app.routingservice.dto.vehicle.VehicleResponse;
import org.app.routingservice.service.VehicleService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/routing/vehicles")
@Slf4j
public class VehicleController {

    private final VehicleService vehicleService;

    @GetMapping
    public ResponseEntity<List<VehicleResponse>> getAllVehicles(
            @RequestParam(required = false) String hub,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String vehicleType) {
        List<VehicleResponse> vehicles = vehicleService.getAllVehicles(hub, status, vehicleType);
        return ResponseEntity.ok(vehicles);
    }

    @GetMapping("/available")
    public ResponseEntity<List<VehicleResponse>> getAvailableVehiclesAtHub(@RequestParam String hub) {
        List<VehicleResponse> vehicles = vehicleService.getAvailableVehiclesAtHub(hub);
        return ResponseEntity.ok(vehicles);
    }


    @GetMapping("/{id}")
    public ResponseEntity<VehicleResponse> getVehicleById(@PathVariable("id") Long id) {
        VehicleResponse vehicle = vehicleService.getVehicleById(id);
        return ResponseEntity.ok(vehicle);
    }

    @PostMapping
    public ResponseEntity<VehicleResponse> createVehicle(@RequestBody @Valid CreateVehicleRequest request) {
        VehicleResponse vehicle = vehicleService.createVehicle(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(vehicle);
    }

    @PutMapping("/{id}")
    public ResponseEntity<VehicleResponse> updateVehicle(@PathVariable("id") Long id, @RequestBody @Valid UpdateVehicleRequest request) {
        VehicleResponse vehicle = vehicleService.updateVehicle(id, request);
        return ResponseEntity.ok(vehicle);
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<VehicleResponse> updateVehicleStatus(@PathVariable("id") Long id, @RequestParam String status) {
        VehicleResponse vehicle = vehicleService.updateVehicleStatus(id, status);
        return ResponseEntity.ok(vehicle);
    }



}
