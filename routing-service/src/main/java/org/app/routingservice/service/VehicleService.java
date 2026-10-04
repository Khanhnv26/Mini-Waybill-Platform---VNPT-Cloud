package org.app.routingservice.service;

import org.app.routingservice.dto.vehicle.CreateVehicleRequest;
import org.app.routingservice.dto.vehicle.UpdateVehicleRequest;
import org.app.routingservice.dto.vehicle.VehicleResponse;

import java.util.List;

public interface VehicleService {
    List<VehicleResponse> getAllVehicles(String hub, String status, String vehicleType);
    List<VehicleResponse> getAvailableVehiclesAtHub(String hub);
    VehicleResponse getVehicleById(Long id);
    VehicleResponse createVehicle(CreateVehicleRequest request);
    VehicleResponse updateVehicle(Long id, UpdateVehicleRequest request);
    VehicleResponse updateVehicleStatus(Long id, String status);

}
