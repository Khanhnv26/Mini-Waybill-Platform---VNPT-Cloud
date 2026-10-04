package org.app.routingservice.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.app.routingservice.client.ShipperClient;
import org.app.routingservice.dto.eta.EtaCalculationRequest;
import org.app.routingservice.dto.eta.EtaCalculationResponse;
import org.app.routingservice.dto.operation.StationCapacityDto;
import org.app.routingservice.entity.Hub;
import org.app.routingservice.entity.Trip;
import org.app.routingservice.entity.TripManifest;
import org.app.routingservice.entity.TripStop;
import org.app.routingservice.entity.WarehouseInventory;
import org.app.routingservice.repository.HubRepository;
import org.app.routingservice.repository.TripManifestRepository;
import org.app.routingservice.repository.TripRepository;
import org.app.routingservice.repository.TripStopRepository;
import org.app.routingservice.repository.VehicleRepository;
import org.app.routingservice.repository.WarehouseInventoryRepository;
import org.app.routingservice.service.DeliveryEtaService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
public class DeliveryEtaServiceImpl implements DeliveryEtaService {

    private static final Set<String> LEG_STATUSES = Set.of(
            "PICKED_UP", "IN_TRANSIT", "ARRIVED_DEST_HUB", "OUT_FOR_DELIVERY");

    private final TripRepository tripRepository;
    private final VehicleRepository vehicleRepository;
    private final ShipperClient shipperClient;
    private final HubRepository hubRepository;
    private final WarehouseInventoryRepository warehouseInventoryRepository;
    private final TripManifestRepository tripManifestRepository;
    private final TripStopRepository tripStopRepository;

    @Value("${logistics.eta.cutoff-hour:18}")
    private int cutOffHour;

    @Value("${logistics.eta.pickup-buffer-hours:2}")
    private int pickupBufferHours;

    @Value("${logistics.eta.last-mile-hours:4}")
    private int lastMileHours;

    @Value("${logistics.eta.truck-speed-kmh:55.0}")
    private double truckSpeedKmh;

    @Override
    public EtaCalculationResponse calculateDeliveryEta(EtaCalculationRequest request) {
        String currentStatus = normalizeStatus(request.getCurrentStatus());
        if (currentStatus != null && LEG_STATUSES.contains(currentStatus)) {
            return calculateLegAwareEta(request, currentStatus);
        }
        return calculatePreShipmentEta(request);
    }

    // ================================================================ PRE-SHIPMENT

    private EtaCalculationResponse calculatePreShipmentEta(EtaCalculationRequest request) {
        LocalDateTime now = request.getCreatedAt() != null ? request.getCreatedAt() : LocalDateTime.now();
        double weight = request.getWeight() != null ? request.getWeight() : 1.0;

        // Tự động phân giải Hub từ địa chỉ gửi / nhận thông qua DB Hubs
        Hub originHub = resolveHub(request.getOriginHub(), request.getSenderAddress(), "HUB-HN-01");
        Hub destHub = resolveHub(request.getDestinationHub(), request.getReceiverAddress(), "HUB-HCM-01");

        String originHubCode = originHub != null ? originHub.getHubCode() : "HUB-HN-01";
        String destHubCode = destHub != null ? destHub.getHubCode() : "HUB-HCM-01";

        // Chốt thời gian gom hàng
        LocalDateTime readyForTransit = now.plusHours(pickupBufferHours);
        if (now.getHour() >= cutOffHour) {
            readyForTransit = now.plusDays(1).withHour(8).withMinute(0);
        }

        // Kiểm tra số lượng xe tại Hub xuất phát
        long availableVehicles = vehicleRepository.countByCurrentHubAndStatus(originHubCode, "AVAILABLE");
        boolean isFleetConstrained = false;

        if (availableVehicles == 0) {
            isFleetConstrained = true;
            log.warn("Hub {} hết xe khả dụng! Chờ xe quay đầu +12h.", originHubCode);
            readyForTransit = readyForTransit.plusHours(12);
        }

        // Tìm chuyến xe khả dụng
        List<Trip> availableTrips = tripRepository.findAvailableTrips(originHubCode, weight, readyForTransit);
        Trip assignedTrip = availableTrips.isEmpty() ? null : availableTrips.get(0);

        // Tính thời gian xe chạy thực tế theo tọa độ GPS giữa 2 Hub
        double distanceKm = calculateDistanceKm(originHub, destHub);
        long transitHours = Math.max(3, Math.round(distanceKm / truckSpeedKmh) + 2); // +2h nghỉ bến/bốc xếp
        log.info("Tuyến {} -> {} (khoảng cách ~{} km), thời gian xe chạy: {} tiếng", originHubCode, destHubCode, Math.round(distanceKm), transitHours);

        String assignedTripCode = null;
        String vehiclePlate = null;
        LocalDateTime arrivalAtDestHub;

        if (assignedTrip != null) {
            assignedTripCode = assignedTrip.getTripCode();
            vehiclePlate = assignedTrip.getVehiclePlate();

            LocalDateTime depTime = assignedTrip.getScheduledDepartureTime();
            if (depTime == null) {
                depTime = assignedTrip.getDepartureTime();
            }
            if (depTime == null) {
                depTime = readyForTransit;
            }
            arrivalAtDestHub = depTime.plusHours(transitHours);
        } else {
            log.warn("Chưa có chuyến xe từ {} đi {}. Áp dụng SLA theo khoảng cách!", originHubCode, destHubCode);
            assignedTripCode = null;
            vehiclePlate = null;
            LocalDateTime defaultDep = readyForTransit.toLocalDate().atTime(20, 0);
            if (readyForTransit.isAfter(defaultDep)) {
                defaultDep = defaultDep.plusDays(1);
            }
            arrivalAtDestHub = defaultDep.plusHours(transitHours);
        }

        // Kiểm tra năng lực Shipper tại Hub đích
        int availableCapacity = 50;
        boolean isOverLoaded = false;
        try {
            StationCapacityDto capacity = shipperClient.getStationCapacity(destHubCode);
            if (capacity != null) {
                availableCapacity = capacity.getAvailableCapacity();
                isOverLoaded = capacity.isOverLoaded();
            }
        } catch (Exception e) {
            log.warn("Không gọi được shipper-service để lấy công suất trạm {}: {}", destHubCode, e.getMessage());
        }

        // Tính ETA giao hàng
        LocalDateTime estimatedDeliveryTime = arrivalAtDestHub.plusHours(lastMileHours);

        if (isOverLoaded || availableCapacity <= 0) {
            log.warn("Trạm {} quá tải hoặc hết công suất! Chờ xử lý +24h.", destHubCode);
            estimatedDeliveryTime = estimatedDeliveryTime.plusDays(1);
        }

        LocalDateTime estimatedDeliveryMax = estimatedDeliveryTime.plusHours(12);

        return EtaCalculationResponse.builder()
                .estimatedDeliveryTime(estimatedDeliveryTime)
                .estimatedDeliveryMax(estimatedDeliveryMax)
                .displayDateRange(formatDateRange(estimatedDeliveryTime, estimatedDeliveryMax))
                .displayCommitmentTime(formatCommitmentTime(estimatedDeliveryTime))
                .assignedTripCode(assignedTripCode)
                .vehiclePlate(vehiclePlate)
                .availableVehicleAtOriginHub((int) availableVehicles)
                .activeShippersAtDest(null)
                .availableCapacityAtDest(availableCapacity)
                .isFleetConstrained(isFleetConstrained)
                .etaBasis("PRE_SHIPMENT")
                .build();
    }

    // ================================================================ LEG-AWARE

    private EtaCalculationResponse calculateLegAwareEta(EtaCalculationRequest request, String currentStatus) {
        LocalDateTime now = request.getMilestoneAt() != null ? request.getMilestoneAt() : LocalDateTime.now();

        Hub originHub = resolveHub(request.getOriginHub(), request.getSenderAddress(), "HUB-HN-01");
        Hub destHub = resolveHub(request.getDestinationHub(), request.getReceiverAddress(), "HUB-HCM-01");
        String originHubCode = originHub != null ? originHub.getHubCode() : "HUB-HN-01";
        String destHubCode = destHub != null ? destHub.getHubCode() : "HUB-HCM-01";

        WarehouseInventory inventory = findInventory(request.getTrackingCode());
        Trip trip = findActiveTrip(request, inventory);

        String currentLocation = firstNonBlank(
                request.getCurrentLocation(),
                inventory != null ? inventory.getLocationCode() : null,
                trip != null ? trip.getCurrentHub() : null,
                originHubCode);
        String currentHubCode = normalizeHubCode(currentLocation);

        boolean lastMileStage = "ARRIVED_DEST_HUB".equals(currentStatus) || "OUT_FOR_DELIVERY".equals(currentStatus);
        double remainingKm = lastMileStage ? 0.0 : computeRemainingDistanceKm(trip, currentHubCode, destHub);

        int availableCapacity = 50;
        boolean isOverLoaded = false;
        if (!"OUT_FOR_DELIVERY".equals(currentStatus)) {
            try {
                StationCapacityDto capacity = shipperClient.getStationCapacity(destHubCode);
                if (capacity != null) {
                    availableCapacity = capacity.getAvailableCapacity();
                    isOverLoaded = capacity.isOverLoaded();
                }
            } catch (Exception e) {
                log.warn("Không gọi được shipper-service để lấy công suất trạm {}: {}", destHubCode, e.getMessage());
            }
        }

        LocalDateTime estimatedDeliveryTime;
        String etaBasis;

        switch (currentStatus) {
            case "OUT_FOR_DELIVERY" -> {
                estimatedDeliveryTime = now.plusHours(lastMileHours);
                etaBasis = "LAST_MILE";
            }
            case "ARRIVED_DEST_HUB" -> {
                estimatedDeliveryTime = now.plusHours(lastMileHours);
                if (isOverLoaded || availableCapacity <= 0) {
                    estimatedDeliveryTime = estimatedDeliveryTime.plusDays(1);
                }
                etaBasis = "DEST_HUB_LAST_MILE";
            }
            default -> {
                long transitHours = Math.max(1, Math.round(remainingKm / truckSpeedKmh) + 2);
                LocalDateTime departureBase = now;
                if (trip != null && !"IN_TRANSIT".equalsIgnoreCase(trip.getStatus())) {
                    LocalDateTime dep = trip.getScheduledDepartureTime() != null
                            ? trip.getScheduledDepartureTime() : trip.getDepartureTime();
                    if (dep != null && dep.isAfter(now)) {
                        departureBase = dep;
                    }
                }
                LocalDateTime arrivalAtDestHub = departureBase.plusHours(transitHours);
                estimatedDeliveryTime = arrivalAtDestHub.plusHours(lastMileHours);
                if (isOverLoaded || availableCapacity <= 0) {
                    estimatedDeliveryTime = estimatedDeliveryTime.plusDays(1);
                }
                etaBasis = "IN_TRANSIT".equals(currentStatus) ? "IN_TRANSIT_LEG" : "WAITING_DEPARTURE";
            }
        }

        LocalDateTime estimatedDeliveryMax = estimatedDeliveryTime.plusHours(12);
        log.info("[ETA-LEG] Đơn {} status={} tại {} -> {} còn ~{} km (basis={})",
                request.getTrackingCode(), currentStatus, currentHubCode, destHubCode,
                Math.round(remainingKm), etaBasis);

        return EtaCalculationResponse.builder()
                .estimatedDeliveryTime(estimatedDeliveryTime)
                .estimatedDeliveryMax(estimatedDeliveryMax)
                .displayDateRange(formatDateRange(estimatedDeliveryTime, estimatedDeliveryMax))
                .displayCommitmentTime(formatCommitmentTime(estimatedDeliveryTime))
                .assignedTripCode(trip != null ? trip.getTripCode() : request.getAssignedTripCode())
                .vehiclePlate(trip != null ? trip.getVehiclePlate() : null)
                .availableVehicleAtOriginHub(null)
                .activeShippersAtDest(null)
                .availableCapacityAtDest(availableCapacity)
                .isFleetConstrained(false)
                .currentLeg(resolveTransportLeg(inventory, currentStatus))
                .remainingDistanceKm(Math.round(remainingKm * 10.0) / 10.0)
                .etaBasis(etaBasis)
                .build();
    }

    private WarehouseInventory findInventory(String trackingCode) {
        if (trackingCode == null || trackingCode.isBlank()) {
            return null;
        }
        return warehouseInventoryRepository.findByTrackingCode(trackingCode).orElse(null);
    }

    private Trip findActiveTrip(EtaCalculationRequest request, WarehouseInventory inventory) {
        if (request.getAssignedTripCode() != null && !request.getAssignedTripCode().isBlank()) {
            Trip byCode = tripRepository.findByTripCode(request.getAssignedTripCode().trim()).orElse(null);
            if (byCode != null) {
                return byCode;
            }
        }
        if (inventory != null && inventory.getActiveTripId() != null) {
            Trip byInventory = tripRepository.findById(inventory.getActiveTripId()).orElse(null);
            if (byInventory != null) {
                return byInventory;
            }
        }
        if (request.getTrackingCode() != null && !request.getTrackingCode().isBlank()) {
            List<TripManifest> manifests = tripManifestRepository.findByTrackingCode(request.getTrackingCode());
            TripManifest active = manifests.stream()
                    .filter(m -> "LOADED".equalsIgnoreCase(m.getStatus()) || "HOLD_FOR_RETURN".equalsIgnoreCase(m.getStatus()))
                    .findFirst()
                    .orElse(null);
            if (active != null) {
                return tripRepository.findById(active.getTripId()).orElse(null);
            }
        }
        return null;
    }

    private double computeRemainingDistanceKm(Trip trip, String currentHubCode, Hub destHub) {
        Map<String, Hub> hubs = loadHubMap();
        Hub currentHubEntity = currentHubCode != null ? hubs.get(normalizeHubCode(currentHubCode)) : null;
        if (currentHubEntity == null && currentHubCode != null) {
            currentHubEntity = hubRepository.findByHubCode(normalizeHubCode(currentHubCode)).orElse(null);
        }

        if (trip != null && "IN_TRANSIT".equalsIgnoreCase(trip.getStatus()) && trip.getId() != null) {
            List<TripStop> stops = tripStopRepository.findByTripIdOrderByStopOrder(trip.getId());
            if (stops != null && stops.size() >= 2) {
                int index = -1;
                for (int i = 0; i < stops.size(); i++) {
                    if (currentHubCode != null && currentHubCode.equalsIgnoreCase(stops.get(i).getHubCode())) {
                        index = i;
                        break;
                    }
                }
                if (index >= 0 && index < stops.size() - 1) {
                    double total = 0.0;
                    for (int i = index; i < stops.size() - 1; i++) {
                        Hub a = hubs.get(stops.get(i).getHubCode());
                        Hub b = hubs.get(stops.get(i + 1).getHubCode());
                        total += legDistance(a, b);
                    }
                    if (total > 0) {
                        return total;
                    }
                }
            }
        }
        return calculateDistanceKm(currentHubEntity, destHub);
    }

    private Map<String, Hub> loadHubMap() {
        Map<String, Hub> map = new HashMap<>();
        for (Hub hub : hubRepository.findAll()) {
            if (hub.getHubCode() != null) {
                map.put(hub.getHubCode(), hub);
            }
        }
        return map;
    }

    private double legDistance(Hub a, Hub b) {
        if (a == null || b == null) {
            return 0.0;
        }
        return calculateDistanceKm(a, b);
    }

    private String resolveTransportLeg(WarehouseInventory inventory, String currentStatus) {
        if (inventory != null && inventory.getTransportLeg() != null) {
            return inventory.getTransportLeg().name();
        }
        return switch (currentStatus) {
            case "PICKED_UP" -> "ORIGIN_FEEDER";
            case "ARRIVED_DEST_HUB" -> "DESTINATION_FEEDER";
            case "OUT_FOR_DELIVERY" -> "LAST_MILE";
            default -> "LINEHAUL";
        };
    }

    private String normalizeStatus(String status) {
        if (status == null || status.isBlank()) {
            return null;
        }
        return status.trim().toUpperCase();
    }

    private String normalizeHubCode(String code) {
        if (code == null || code.isBlank()) {
            return null;
        }
        return code.trim().toUpperCase();
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return null;
    }

    private String formatDateRange(LocalDateTime eta, LocalDateTime etaMax) {
        DateTimeFormatter dateFormatter = DateTimeFormatter.ofPattern("dd 'Th'MM");
        return eta.format(dateFormatter) + " - " + etaMax.format(dateFormatter);
    }

    private String formatCommitmentTime(LocalDateTime eta) {
        return "Trước " + eta.format(DateTimeFormatter.ofPattern("HH:mm"));
    }

    // ================================================================ HELPERS

    private double calculateDistanceKm(Hub h1, Hub h2) {
        if (h1 == null || h2 == null || h1.getLatitude() == null || h1.getLongitude() == null
                || h2.getLatitude() == null || h2.getLongitude() == null) {
            return 300.0;
        }
        double lat1 = Math.toRadians(h1.getLatitude());
        double lon1 = Math.toRadians(h1.getLongitude());
        double lat2 = Math.toRadians(h2.getLatitude());
        double lon2 = Math.toRadians(h2.getLongitude());

        double dLat = lat2 - lat1;
        double dLon = lon2 - lon1;

        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return 6371.0 * c;
    }

    private Hub resolveHub(String hubCode, String address, String fallbackHubCode) {
        if (hubCode != null && !hubCode.isBlank()) {
            return hubRepository.findByHubCode(hubCode)
                    .orElseGet(() -> hubRepository.findByHubCode(fallbackHubCode).orElse(null));
        }

        if (address == null || address.isBlank()) {
            return hubRepository.findByHubCode(fallbackHubCode).orElse(null);
        }

        String normalizedAddress = unaccent(address.toLowerCase());
        List<Hub> allHubs = hubRepository.findAll();

        for (Hub h : allHubs) {
            if (h.getProvince() != null && normalizedAddress.contains(unaccent(h.getProvince().toLowerCase()))) {
                return h;
            }
        }
        return hubRepository.findByHubCode(fallbackHubCode).orElse(null);
    }

    private String unaccent(String text) {
        if (text == null) return "";
        String normalized = Normalizer.normalize(text, Normalizer.Form.NFD);
        Pattern pattern = Pattern.compile("\\p{InCombiningDiacriticalMarks}+");
        return pattern.matcher(normalized).replaceAll("").replace('đ', 'd').replace('Đ', 'd');
    }
}