package org.app.routingservice.service;

import org.app.routingservice.dto.operation.HandoffRequest;
import org.app.routingservice.dto.operation.InventoryOperationRequest;
import org.app.routingservice.entity.HandlingEvent;
import org.app.routingservice.entity.WarehouseInventory;

import java.util.List;

public interface InventoryOperationService {
    List<WarehouseInventory> receive(String locationCode, InventoryOperationRequest request,
                                      String actorId, String roles, String permissions, String actorLocationCode);

    List<WarehouseInventory> store(String locationCode, InventoryOperationRequest request,
                                   String actorId, String roles, String permissions, String actorLocationCode);

    WarehouseInventory handoff(String locationCode, HandoffRequest request,
                               String actorId, String roles, String permissions, String actorLocationCode);

    List<WarehouseInventory> getInventory(String locationCode, String inventoryStatus);

    List<HandlingEvent> getOperationHistory(String trackingCode);
}
