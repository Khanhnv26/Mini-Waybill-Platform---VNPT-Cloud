package org.app.routingservice.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.app.routingservice.dto.vehicle.CreateVehicleRequest;
import org.app.routingservice.dto.vehicle.UpdateVehicleRequest;
import org.app.routingservice.dto.vehicle.VehicleResponse;
import org.app.routingservice.entity.Vehicle;
import org.app.routingservice.repository.VehicleRepository;
import org.app.routingservice.service.VehicleService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;


@RequiredArgsConstructor
@Slf4j
@Service
public class VehicleServiceImpl implements VehicleService {


    private final VehicleRepository vehicleRepository;


    @Override
    @Transactional(readOnly = true)
    public List<VehicleResponse> getAllVehicles(String hub, String status, String vehicleType) {
        return vehicleRepository.findAll().stream()
                .filter(v -> hub == null || hub.isBlank() || "ALL".equalsIgnoreCase(hub) || hub.equalsIgnoreCase(v.getCurrentHub()))
                .filter(v -> status == null || status.isBlank() || "ALL".equalsIgnoreCase(status) || status.equalsIgnoreCase(v.getStatus()))
                .filter(v -> vehicleType == null || vehicleType.isBlank() || "ALL".equalsIgnoreCase(vehicleType) || vehicleType.equalsIgnoreCase(v.getVehicleType()))
                .map(this::mapToResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<VehicleResponse> getAvailableVehiclesAtHub(String hub) {
        return vehicleRepository.findByCurrentHubAndStatus(hub, "AVAILABLE").stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public VehicleResponse getVehicleById(Long id) {
        Vehicle vehicle = vehicleRepository.findById(id).orElseThrow(
                () -> new IllegalArgumentException("Không tìm thấy xe với ID: " + id));
        return mapToResponse(vehicle);
    }

    @Override
    @Transactional
    public VehicleResponse createVehicle(CreateVehicleRequest request) {
        if(vehicleRepository.existsByVehiclePlate(request.getVehiclePlate().trim())) {
            throw new IllegalArgumentException("Biển số xe đã tồn tại " + request.getVehiclePlate());
        }

        Vehicle vehicle = Vehicle.builder()
                .vehiclePlate(request.getVehiclePlate().trim().toUpperCase())
                .modelName(request.getModelName().trim())
                .vehicleType(request.getVehicleType().trim())
                .payloadCapacity(request.getPayloadCapacity())
                .currentHub(request.getCurrentHub().trim().toUpperCase())
                .status("AVAILABLE")
                .assignedDriverName(request.getAssignedDriverName() != null ? request.getAssignedDriverName().trim() : null)
                .driverPhone(request.getDriverPhone() != null ? request.getDriverPhone().trim() : null)
                .createdAt(LocalDateTime.now())
                .build();
        return mapToResponse(vehicleRepository.save(vehicle));
    }

    @Override
    @Transactional
    public VehicleResponse updateVehicle(Long id, UpdateVehicleRequest request) {
        Vehicle vehicle = vehicleRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy xe với ID: " + id));

        if (request.getModelName() != null) vehicle.setModelName(request.getModelName().trim());
        if (request.getVehicleType() != null) vehicle.setVehicleType(request.getVehicleType().trim());
        if (request.getPayloadCapacity() != null) vehicle.setPayloadCapacity(request.getPayloadCapacity());
        if (request.getCurrentHub() != null) vehicle.setCurrentHub(request.getCurrentHub().trim().toUpperCase());
        if (request.getStatus() != null) vehicle.setStatus(request.getStatus().trim().toUpperCase());
        if (request.getAssignedDriverName() != null) vehicle.setAssignedDriverName(request.getAssignedDriverName().trim());
        if (request.getDriverPhone() != null) vehicle.setDriverPhone(request.getDriverPhone().trim());
        return mapToResponse(vehicleRepository.save(vehicle));
    }

    @Override
    @Transactional
    public VehicleResponse updateVehicleStatus(Long id, String status) {
        Vehicle vehicle = vehicleRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy xe với ID: " + id));

        String normalizedStatus = status.trim().toUpperCase();

        if (!List.of("AVAILABLE", "ON_TRIP", "MAINTENANCE","DISABLED").contains(normalizedStatus)) {
            throw new IllegalArgumentException("Trạng thái xe không hợp lệ: " + status);
        }


        if("ON_TRIP".equals(vehicle.getStatus()) && "DISABLED".equals(normalizedStatus)) {
            throw new IllegalArgumentException("Không thể khoá xe khi đang trên chuyến");

        }

        vehicle.setStatus(normalizedStatus);
        return mapToResponse(vehicleRepository.save(vehicle));
    }

    private VehicleResponse mapToResponse(Vehicle v) {
        return VehicleResponse.builder()
                .id(v.getId())
                .vehiclePlate(v.getVehiclePlate())
                .modelName(v.getModelName())
                .vehicleType(v.getVehicleType())
                .payloadCapacity(v.getPayloadCapacity())
                .currentHub(v.getCurrentHub())
                .status(v.getStatus())
                .assignedDriverName(v.getAssignedDriverName())
                .driverPhone(v.getDriverPhone())
                .createdAt(v.getCreatedAt() != null ? v.getCreatedAt().toString() : null)
                .build();
    }
}
