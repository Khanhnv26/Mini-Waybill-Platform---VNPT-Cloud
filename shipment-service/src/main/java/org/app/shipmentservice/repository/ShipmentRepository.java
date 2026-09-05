package org.app.shipmentservice.repository;

import org.app.shipmentservice.entity.Shipment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ShipmentRepository extends JpaRepository<Shipment, Long> {
    Optional<Shipment> findShipmentByTrackingCode(String trackingCode);
    Optional<List<Shipment>> findAllByCustomerId(Long customerId);

}
