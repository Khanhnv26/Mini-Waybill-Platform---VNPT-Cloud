package org.app.routingservice.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.app.routingservice.dto.event.ShipmentStatusUpdatedEvent;
import org.app.routingservice.dto.operation.HandoffRequest;
import org.app.routingservice.dto.operation.InventoryOperationRequest;
import org.app.routingservice.entity.HandlingEvent;
import org.app.routingservice.entity.WarehouseInventory;
import org.app.routingservice.repository.HandlingEventRepository;
import org.app.routingservice.repository.RoutingAssignmentRepository;
import org.app.routingservice.repository.WarehouseInventoryRepository;
import org.app.routingservice.service.InventoryOperationService;
import org.app.sharedevents.entity.OperationType;
import org.app.sharedevents.entity.ShipmentLifecycleEvent;
import org.app.sharedevents.entity.TransportLeg;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class InventoryOperationServiceImpl implements InventoryOperationService {

    private final WarehouseInventoryRepository inventoryRepository;
    private final HandlingEventRepository handlingEventRepository;
    private final RoutingAssignmentRepository routingAssignmentRepository;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    @Override
    @Transactional
    public List<WarehouseInventory> receive(String locationCode, InventoryOperationRequest request,
                                            String actorId, String roles, String permissions,
                                            String actorLocationCode) {
        String location = normalizeLocation(locationCode);
        requireLocationPermission(location, roles, permissions, actorLocationCode, false);
        List<WarehouseInventory> result = new ArrayList<>();
        String operationBase = operationBase(request != null ? request.getOperationId() : null);

        for (String rawCode : request.getTrackingCodes()) {
            String trackingCode = normalizeTrackingCode(rawCode);
            String operationId = operationKey(operationBase, trackingCode);
            HandlingEvent alreadyProcessed = handlingEventRepository.findByOperationId(operationId).orElse(null);
            if (alreadyProcessed != null) {
                inventoryRepository.findByTrackingCode(trackingCode).ifPresent(result::add);
                continue;
            }

            WarehouseInventory inventory = inventoryRepository.findByTrackingCode(trackingCode).orElse(null);
            String previousLocation = inventory != null ? inventory.getLocationCode() : null;
            if (inventory != null && inventory.getActiveTripId() != null) {
                throw new IllegalStateException("Bưu gửi " + trackingCode + " đang nằm trên chuyến xe " + inventory.getActiveTripId());
            }
            if (inventory != null && "CANCELLED".equalsIgnoreCase(inventory.getInventoryStatus())) {
                throw new IllegalStateException("Bưu gửi " + trackingCode + " đã bị hủy, không thể tiếp nhận lại");
            }
            if (inventory != null && location.equalsIgnoreCase(previousLocation)) {
                if ("STORED".equalsIgnoreCase(inventory.getInventoryStatus())) {
                    throw new IllegalStateException("Bưu gửi " + trackingCode + " đã được lưu kho tại " + location);
                }
                if ("RECEIVED".equalsIgnoreCase(inventory.getInventoryStatus())) {
                    // A repeated receive with a different operation ID must not
                    // regress an already received row or emit duplicate lifecycle events.
                    result.add(inventory);
                    continue;
                }
            }

            LocalDateTime now = LocalDateTime.now();
            String status = request.getShipmentStatus() != null && !request.getShipmentStatus().isBlank()
                    ? normalizeOperationalStatus(request.getShipmentStatus())
                    : deriveReceiveStatus(previousLocation, location, inventory != null ? inventory.getInventoryStatus() : null);
            if (inventory == null) {
                // A receive request must belong to a known routed shipment. Do not
                // manufacture an inventory row for an arbitrary barcode.
                if (routingAssignmentRepository.findByTrackingCode(trackingCode).isEmpty()) {
                    throw new IllegalStateException("Không tìm thấy phân tuyến cho bưu gửi " + trackingCode);
                }
                inventory = WarehouseInventory.builder()
                        .trackingCode(trackingCode)
                        .build();
            }
            inventory.setLocationCode(location);
            inventory.setInventoryStatus("RECEIVED");
            inventory.setTransportLeg(request.getTransportLeg() != null
                    ? request.getTransportLeg() : inventory.getTransportLeg());
            inventory.setActiveTripId(null);
            inventory.setReceivedAt(now);
            inventory.setUpdatedAt(now);
            WarehouseInventory saved = inventoryRepository.save(inventory);

            OperationType operationType = location.startsWith("HUB-") ? OperationType.ARRIVED : OperationType.RECEIVED_AT_POST_OFFICE;
            HandlingEvent handlingEvent = saveHandlingEvent(operationId, trackingCode, operationType,
                    saved.getTransportLeg(), location, request.getTripCode(), actorId,
                    request.getNote(), now);
            publishLifecycle(trackingCode, status, operationType, saved.getTransportLeg(), location,
                    request.getTripCode(), actorId, request.getNote(), now, operationId);
            // Keep the shipment-service projection in sync during migration. The
            // lifecycle event remains the authoritative physical-operation record.
            publishLegacyStatus(trackingCode, status, location, request.getNote(), now);
            result.add(saved);
            log.info("[ROUTING] Receive {} tại {} với operationId={}", trackingCode, location, handlingEvent.getOperationId());
        }
        return result;
    }

    @Override
    @Transactional
    public List<WarehouseInventory> store(String locationCode, InventoryOperationRequest request,
                                          String actorId, String roles, String permissions,
                                          String actorLocationCode) {
        String location = normalizeLocation(locationCode);
        requireLocationPermission(location, roles, permissions, actorLocationCode, false);
        List<WarehouseInventory> result = new ArrayList<>();
        String operationBase = operationBase(request != null ? request.getOperationId() : null);

        for (String rawCode : request.getTrackingCodes()) {
            String trackingCode = normalizeTrackingCode(rawCode);
            String operationId = operationKey(operationBase, trackingCode);
            if (handlingEventRepository.existsByOperationId(operationId)) {
                inventoryRepository.findByTrackingCode(trackingCode).ifPresent(result::add);
                continue;
            }

            WarehouseInventory inventory = inventoryRepository.findByTrackingCode(trackingCode)
                    .orElseThrow(() -> new IllegalStateException("Chưa tiếp nhận bưu gửi " + trackingCode));
            if (!location.equalsIgnoreCase(inventory.getLocationCode())) {
                throw new IllegalStateException(String.format("Bưu gửi %s đang ở %s, không thể nhập kho tại %s",
                        trackingCode, inventory.getLocationCode(), location));
            }
            if (!List.of("RECEIVED", "STORED").contains(inventory.getInventoryStatus())) {
                throw new IllegalStateException("Bưu gửi " + trackingCode + " đang ở trạng thái tồn kho " + inventory.getInventoryStatus());
            }

            LocalDateTime now = LocalDateTime.now();
            inventory.setInventoryStatus("STORED");
            inventory.setStoredAt(now);
            inventory.setUpdatedAt(now);
            WarehouseInventory saved = inventoryRepository.save(inventory);
            OperationType operationType = location.startsWith("HUB-") ? OperationType.STORED_AT_HUB : OperationType.STORED;
            saveHandlingEvent(operationId, trackingCode, operationType, saved.getTransportLeg(), location,
                    request.getTripCode(), actorId, request.getNote(), now);
            String publicStatus = currentShipmentStatus(request.getShipmentStatus(), saved);
            publishLifecycle(trackingCode, publicStatus, operationType,
                    saved.getTransportLeg(), location, request.getTripCode(), actorId, request.getNote(), now, operationId);
            // ShipmentService still consumes the legacy status topic. Publish the
            // unchanged public status so a physical store action is visible after refresh.
            publishLegacyStatus(trackingCode, publicStatus, location, request.getNote(), now);
            result.add(saved);
        }
        return result;
    }

    @Override
    @Transactional
    public WarehouseInventory handoff(String locationCode, HandoffRequest request,
                                      String actorId, String roles, String permissions,
                                      String actorLocationCode) {
        String location = normalizeLocation(locationCode);
        requireLocationPermission(location, roles, permissions, actorLocationCode, true);
        String trackingCode = normalizeTrackingCode(request.getTrackingCode());
        String operationId = operationKey(operationBase(request.getOperationId()), trackingCode);
        WarehouseInventory inventory = inventoryRepository.findByTrackingCode(trackingCode)
                .orElseThrow(() -> new IllegalStateException("Không tìm thấy tồn kho cho bưu gửi " + trackingCode));

        HandlingEvent alreadyProcessed = handlingEventRepository.findByOperationId(operationId).orElse(null);
        if (alreadyProcessed != null) return inventory;
        if (!location.equalsIgnoreCase(inventory.getLocationCode())) {
            throw new IllegalStateException("Bưu gửi " + trackingCode + " không nằm tại bưu cục " + location);
        }
        if (!"STORED".equalsIgnoreCase(inventory.getInventoryStatus())) {
            throw new IllegalStateException("Bưu gửi " + trackingCode + " chưa được nhập kho, không thể bàn giao bưu tá");
        }

        LocalDateTime now = LocalDateTime.now();
        inventory.setInventoryStatus("HANDED_TO_COURIER");
        inventory.setActiveTripId(null);
        inventory.setUpdatedAt(now);
        WarehouseInventory saved = inventoryRepository.save(inventory);
        String note = request.getNote() != null && !request.getNote().isBlank()
                ? request.getNote() : "Bưu cục " + location + " bàn giao bưu gửi cho bưu tá " + request.getCourierId();
        saveHandlingEvent(operationId, trackingCode, OperationType.HANDED_TO_COURIER, TransportLeg.LAST_MILE,
                location, null, actorId, note, now);
        publishLifecycle(trackingCode, "OUT_FOR_DELIVERY", OperationType.HANDED_TO_COURIER,
                TransportLeg.LAST_MILE, location, null, request.getCourierId(), note, now, operationId);
        publishLegacyStatus(trackingCode, "OUT_FOR_DELIVERY", location, note, now);
        return saved;
    }

    @Override
    @Transactional(readOnly = true)
    public List<WarehouseInventory> getInventory(String locationCode, String inventoryStatus,
                                                 String roles, String permissions, String actorLocationCode) {
        String location = normalizeLocation(locationCode);
        requireLocationPermission(location, roles, permissions, actorLocationCode, false);
        if (inventoryStatus == null || inventoryStatus.isBlank()) {
            return inventoryRepository.findByLocationCodeOrderByUpdatedAtDesc(location);
        }
        return inventoryRepository.findByLocationCodeAndInventoryStatusOrderByUpdatedAtDesc(
                location, inventoryStatus.trim().toUpperCase(Locale.ROOT));
    }

    @Override
    @Transactional(readOnly = true)
    public List<HandlingEvent> getOperationHistory(String trackingCode) {
        return handlingEventRepository.findByTrackingCodeOrderByOccurredAtAsc(normalizeTrackingCode(trackingCode));
    }

    private HandlingEvent saveHandlingEvent(String operationId, String trackingCode, OperationType operationType,
                                            TransportLeg transportLeg, String locationCode, String tripCode,
                                            String actorId, String note, LocalDateTime occurredAt) {
        return handlingEventRepository.save(HandlingEvent.builder()
                .operationId(operationId)
                .trackingCode(trackingCode)
                .operationType(operationType)
                .transportLeg(transportLeg)
                .locationCode(locationCode)
                .tripCode(tripCode)
                .actorId(actorId)
                .note(note)
                .occurredAt(occurredAt)
                .build());
    }

    private void publishLifecycle(String trackingCode, String status, OperationType operationType,
                                  TransportLeg transportLeg, String locationCode, String tripCode,
                                  String actorId, String note, LocalDateTime occurredAt, String eventId) {
        kafkaTemplate.send("shipment-lifecycle-events", trackingCode, ShipmentLifecycleEvent.builder()
                .eventId(eventId)
                .trackingCode(trackingCode)
                .status(status)
                .transportLeg(transportLeg)
                .operationType(operationType)
                .locationCode(locationCode)
                .tripCode(tripCode)
                .actorId(actorId)
                .note(note)
                .occurredAt(occurredAt)
                .build());
    }

    private void publishLegacyStatus(String trackingCode, String status, String locationCode,
                                     String note, LocalDateTime occurredAt) {
        kafkaTemplate.send("tracking-status-events", trackingCode, ShipmentStatusUpdatedEvent.builder()
                .trackingCode(trackingCode)
                .status(status)
                .locationCode(locationCode)
                .note(note)
                .updateAt(occurredAt.toString())
                .build());
    }

    private void requireLocationPermission(String locationCode, String roles, String permissions,
                                           String actorLocationCode, boolean handoff) {
        String normalizedRoles = roles == null ? "" : roles.toUpperCase(Locale.ROOT);
        String normalizedPermissions = permissions == null ? "" : permissions.toLowerCase(Locale.ROOT);
        boolean admin = contains(normalizedRoles, "ADMIN") || contains(normalizedRoles, "ROLE_ADMIN");
        boolean dispatcher = contains(normalizedRoles, "DISPATCHER") || normalizedPermissions.contains("routing:trip_manage");
        boolean postStaff = contains(normalizedRoles, "ROLE_POST_OFFICE_OPERATOR")
                || contains(normalizedRoles, "ROLE_POST_OFFICE_STAFF")
                || normalizedPermissions.contains("tracking:update_post_office");
        boolean hubStaff = contains(normalizedRoles, "ROLE_HUB_OPERATOR")
                || normalizedPermissions.contains("tracking:update_hub");
        boolean allowed = locationCode.startsWith("POST-") ? postStaff : locationCode.startsWith("HUB-") ? hubStaff : false;
        if (admin || dispatcher) allowed = true;
        if (!allowed) {
            throw new SecurityException("Không có quyền tác nghiệp tại " + locationCode);
        }
        if (handoff && !admin && !postStaff) {
            throw new SecurityException("Chỉ nhân viên bưu cục được bàn giao cho bưu tá");
        }
        if (!admin && !dispatcher) {
            if (actorLocationCode == null || actorLocationCode.isBlank()) {
                throw new SecurityException("Tài khoản chưa được gán locationCode nên không thể tác nghiệp tại " + locationCode);
            }
            if (!locationCode.equalsIgnoreCase(actorLocationCode.trim())) {
                throw new SecurityException("Tài khoản không được phân công tại " + locationCode);
            }
        }
    }

    private boolean contains(String value, String token) {
        for (String item : value.split(",")) {
            if (item.trim().equalsIgnoreCase(token)) return true;
        }
        return false;
    }

    private String deriveReceiveStatus(String previousLocation, String location, String inventoryStatus) {
        if (previousLocation == null || previousLocation.isBlank()) return "PICKED_UP";
        if (previousLocation.startsWith("HUB-") && location.startsWith("POST-")) return "ARRIVED_DEST_HUB";
        if ("ROUTE_ASSIGNED".equals(inventoryStatus) || "RECEIVED".equals(inventoryStatus)) return "PICKED_UP";
        return "PICKED_UP";
    }

    private String currentShipmentStatus(String requested, WarehouseInventory inventory) {
        if (requested != null && !requested.isBlank()) return normalizeOperationalStatus(requested);
        if (inventory.getTransportLeg() == TransportLeg.DESTINATION_FEEDER) {
            // The destination feeder changes physical location only; the public
            // milestone remains ARRIVED_DEST_HUB until courier handoff.
            return "ARRIVED_DEST_HUB";
        }
        if (inventory.getLocationCode() != null && inventory.getLocationCode().startsWith("POST-")) {
            return "PICKED_UP";
        }
        return "IN_TRANSIT";
    }

    private String normalizeOperationalStatus(String status) {
        String normalized = normalizeStatus(status);
        if (!List.of("PICKED_UP", "IN_TRANSIT", "ARRIVED_DEST_HUB").contains(normalized)) {
            throw new IllegalArgumentException(
                    "Không thể dùng trạng thái " + normalized + " cho thao tác tiếp nhận/lưu kho");
        }
        return normalized;
    }

    private String normalizeStatus(String status) {
        String normalized = status.trim().toUpperCase(Locale.ROOT);
        if (!List.of("CREATED", "PENDING_ROUTING", "ROUTE_ASSIGNED", "PICKED_UP", "IN_TRANSIT",
                "ARRIVED_DEST_HUB", "OUT_FOR_DELIVERY", "DELIVERED", "DELIVERY_FAILED", "CANCELLED",
                "RETURNING", "RETURNED").contains(normalized)) {
            throw new IllegalArgumentException("Shipment status không hợp lệ: " + status);
        }
        return normalized;
    }

    private String normalizeLocation(String locationCode) {
        if (locationCode == null || locationCode.isBlank()) throw new IllegalArgumentException("locationCode không được để trống");
        return locationCode.trim().toUpperCase(Locale.ROOT);
    }

    private String normalizeTrackingCode(String trackingCode) {
        if (trackingCode == null || trackingCode.isBlank()) throw new IllegalArgumentException("trackingCode không được để trống");
        return trackingCode.trim().toUpperCase(Locale.ROOT);
    }

    private String operationBase(String operationId) {
        return operationId == null || operationId.isBlank() ? UUID.randomUUID().toString() : operationId.trim();
    }

    private String operationKey(String operationBase, String trackingCode) {
        String key = operationBase + ":" + trackingCode;
        return key.length() <= 100 ? key : UUID.nameUUIDFromBytes(key.getBytes()).toString();
    }
}
