package org.app.routingservice.repository;

import jakarta.persistence.LockModeType;
import org.app.routingservice.entity.WarehouseInventory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface WarehouseInventoryRepository extends JpaRepository<WarehouseInventory, Long> {
    Optional<WarehouseInventory> findByTrackingCode(String trackingCode);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT i FROM WarehouseInventory i WHERE i.trackingCode = :trackingCode")
    Optional<WarehouseInventory> findByTrackingCodeForUpdate(@Param("trackingCode") String trackingCode);
    List<WarehouseInventory> findByLocationCodeAndInventoryStatusOrderByUpdatedAtDesc(String locationCode, String inventoryStatus);
    List<WarehouseInventory> findByLocationCodeOrderByUpdatedAtDesc(String locationCode);
    List<WarehouseInventory> findByActiveTripId(Long activeTripId);
}
