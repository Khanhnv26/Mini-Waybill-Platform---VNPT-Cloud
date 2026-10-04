package org.app.routingservice.repository;

import org.app.routingservice.entity.Vehicle;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface VehicleRepository extends JpaRepository<Vehicle, Long> {
    Optional<Vehicle> findByVehiclePlate(String vehiclePlate);

    List<Vehicle> findByCurrentHub(String currentHub);
    List<Vehicle> findByCurrentHubAndStatus(String currentHub, String status);
    List<Vehicle> findByStatus(String status);
    long countByCurrentHubAndStatus(String currentHub, String status);
    List<Vehicle> findByCurrentHubAndStatusAndVehicleType(String currentHub, String status, String vehicleType);

    boolean existsByVehiclePlate(String vehiclePlate);
}

