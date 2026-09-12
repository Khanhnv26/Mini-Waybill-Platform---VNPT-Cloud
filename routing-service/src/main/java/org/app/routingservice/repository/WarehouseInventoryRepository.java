package org.app.routingservice.repository;

import org.app.routingservice.entity.WarehouseInventory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface WarehouseInventoryRepository extends JpaRepository<WarehouseInventory, Long> {
    Optional<WarehouseInventory> findByTrackingCode(String trackingCode);
    List<WarehouseInventory> findByLocationCodeAndInventoryStatusOrderByUpdatedAtDesc(String locationCode, String inventoryStatus);
    List<WarehouseInventory> findByLocationCodeOrderByUpdatedAtDesc(String locationCode);
    List<WarehouseInventory> findByActiveTripId(Long activeTripId);
}
