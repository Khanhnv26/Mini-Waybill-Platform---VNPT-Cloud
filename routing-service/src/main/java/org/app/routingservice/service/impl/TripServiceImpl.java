package org.app.routingservice.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.app.routingservice.dto.event.ShipmentStatusUpdatedEvent;
import org.app.routingservice.dto.trip.ConsolidateItemRequest;
import org.app.routingservice.dto.trip.ConsolidateRequest;
import org.app.routingservice.dto.trip.CreateTripRequest;
import org.app.routingservice.dto.trip.EligibleAssignmentResponse;
import org.app.routingservice.dto.trip.TripDetailResponse;
import org.app.routingservice.dto.trip.TripProgressRequest;
import org.app.routingservice.entity.Hub;
import org.app.routingservice.entity.RoutingAssignment;
import org.app.routingservice.entity.Trip;
import org.app.routingservice.entity.TripManifest;
import org.app.routingservice.entity.TripStop;
import org.app.routingservice.entity.TripType;
import org.app.routingservice.entity.WarehouseInventory;
import org.app.routingservice.repository.HubRepository;
import org.app.routingservice.repository.RoutingAssignmentRepository;
import org.app.routingservice.repository.TripManifestRepository;
import org.app.routingservice.repository.TripRepository;
import org.app.routingservice.repository.TripStopRepository;
import org.app.routingservice.repository.WarehouseInventoryRepository;
import org.app.routingservice.repository.HandlingEventRepository;
import org.app.routingservice.service.TripService;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.app.sharedevents.entity.OperationType;
import org.app.sharedevents.entity.ShipmentLifecycleEvent;
import org.app.sharedevents.entity.TripProgressEvent;
import org.app.sharedevents.entity.TransportLeg;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class TripServiceImpl implements TripService {

    private final TripRepository tripRepository;
    private final HubRepository hubRepository;
    private final TripStopRepository tripStopRepository;
    private final TripManifestRepository tripManifestRepository;
    private final RoutingAssignmentRepository routingAssignmentRepository;
    private final WarehouseInventoryRepository warehouseInventoryRepository;
    private final HandlingEventRepository handlingEventRepository;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    private String normalizeHubCode(String rawCode) {
        if (rawCode == null || rawCode.isBlank()) {
            return rawCode;
        }
        String trimmed = rawCode.trim().toUpperCase();
        return switch (trimmed) {
            case "HUB_HAN", "HUB-HN", "HUB-HAN" -> "HUB-HN-01";
            case "HUB_HP", "HUB_HPH", "HUB-HP", "HUB-HPH" -> "HUB-HP-01";
            case "HUB_DAD", "HUB-DN", "HUB-DAD" -> "HUB-DN-01";
            case "HUB_SGN", "HUB_HCM", "HUB-HCM", "HUB-SGN" -> "HUB-HCM-01";
            case "HUB_CT", "HUB_CTH", "HUB-CT", "HUB-CTH" -> "HUB-CT-01";
            default -> trimmed;
        };
    }

    private TripType inferTripType(String origin, String destination) {
        String normalizedOrigin = normalizeHubCode(origin);
        String normalizedDestination = normalizeHubCode(destination);
        boolean originPostOffice = normalizedOrigin != null && normalizedOrigin.startsWith("POST-");
        boolean destinationPostOffice = normalizedDestination != null && normalizedDestination.startsWith("POST-");
        if (originPostOffice && !destinationPostOffice) return TripType.ORIGIN_FEEDER;
        if (!originPostOffice && destinationPostOffice) return TripType.DESTINATION_FEEDER;
        return TripType.LINEHAUL;
    }

    private TransportLeg inferTransportLeg(String origin, String destination) {
        TripType tripType = inferTripType(origin, destination);
        return switch (tripType) {
            case ORIGIN_FEEDER -> TransportLeg.ORIGIN_FEEDER;
            case LINEHAUL -> TransportLeg.LINEHAUL;
            case DESTINATION_FEEDER -> TransportLeg.DESTINATION_FEEDER;
        };
    }

    private void validateTripType(TripType tripType, String origin, String destination) {
        TripType inferred = inferTripType(origin, destination);
        if (tripType != inferred) {
            throw new IllegalArgumentException(String.format(
                    "Loại chuyến %s không phù hợp với tuyến %s -> %s (cần %s)",
                    tripType, origin, destination, inferred));
        }
    }

    @Override
    @Transactional
    public TripDetailResponse createTrip(CreateTripRequest request) {
        log.info("Khởi tạo chuyến xe mới: route={}, plate={}", request.getRouteName(), request.getVehiclePlate());

        if (request.getStopHubCodes() == null || request.getStopHubCodes().size() < 2) {
            throw new IllegalArgumentException("Chuyến xe phải có ít nhất 2 trạm dừng.");
        }

        String tripCode = (request.getTripCode() != null && !request.getTripCode().isBlank())
                ? request.getTripCode().trim()
                : "TRP-" + LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd")) + "-"
                + UUID.randomUUID().toString().substring(0, 5).toUpperCase();

        String rawOrigin = (request.getOriginHub() != null && !request.getOriginHub().isBlank())
                ? request.getOriginHub().trim()
                : request.getStopHubCodes().get(0);
        String originHub = normalizeHubCode(rawOrigin);

        LocalDateTime scheduledTime = request.getScheduledDepartureTime();
        if (scheduledTime == null) {
            scheduledTime = LocalDateTime.now().plusHours(4);
        }
        int bufferMin = (request.getCutoffBufferMinutes() != null && request.getCutoffBufferMinutes() > 0)
                ? request.getCutoffBufferMinutes() : 30;
        LocalDateTime cutoff = scheduledTime.minusMinutes(bufferMin);
        TripType tripType = request.getTripType() != null
                ? request.getTripType()
                : inferTripType(originHub, request.getStopHubCodes().get(request.getStopHubCodes().size() - 1));
        validateTripType(tripType, originHub, request.getStopHubCodes().get(request.getStopHubCodes().size() - 1));

        Trip trip = Trip.builder()
                .tripCode(tripCode)
                .driverName(request.getDriverName())
                .vehiclePlate(request.getVehiclePlate())
                .routeName(request.getRouteName())
                .maxWeight(request.getMaxWeight() != null ? request.getMaxWeight() : 5000.0)
                .currentWeight(0.0)
                .totalShipments(0)
                .currentHub(originHub)
                .tripType(tripType)
                .status("SCHEDULED")
                .scheduledDepartureTime(scheduledTime)
                .cutoffTime(cutoff)
                .readyToDepart(false)
                .stops(new ArrayList<>())
                .build();

        int order = 1;
        for (String rawHubCode : request.getStopHubCodes()) {
            String hubCode = normalizeHubCode(rawHubCode);
            Hub hub = hubRepository.findByHubCode(hubCode)
                    .or(() -> hubRepository.findByHubCode(rawHubCode))
                    .orElseThrow(() -> new IllegalArgumentException("Hub code không tồn tại: " + rawHubCode));

            TripStop stop = TripStop.builder()
                    .trip(trip)
                    .stopOrder(order++)
                    .hubCode(hub.getHubCode())
                    .status("PENDING")
                    .build();

            trip.getStops().add(stop);
        }

        if (trip.getStops() != null && !trip.getStops().isEmpty() && (originHub == null || originHub.isBlank())) {
            trip.setCurrentHub(trip.getStops().get(0).getHubCode());
        }

        Trip savedTrip = tripRepository.save(trip);
        log.info("Tạo chuyến xe thành công: id={}, tripCode={}", savedTrip.getId(), savedTrip.getTripCode());

        return getTripDetail(savedTrip.getId());
    }

    @Override
    @Transactional(readOnly = true)
    public TripDetailResponse getTripDetail(Long tripId) {
        Trip trip = tripRepository.findById(tripId).orElseThrow(
                () -> new IllegalArgumentException("Không tìm thấy chuyến đi: " + tripId));

        List<TripStop> stops = tripStopRepository.findByTripIdOrderByStopOrder(tripId);
        List<TripManifest> manifests = tripManifestRepository.findByTripId(tripId).stream()
                .filter(m -> !"REMOVED".equalsIgnoreCase(m.getStatus()))
                .collect(Collectors.toList());

        Map<String, Hub> hubsByCode = hubRepository.findAll().stream()
                .collect(Collectors.toMap(Hub::getHubCode, hub -> hub, (first, ignored) -> first));

        List<TripDetailResponse.StopItemResponse> stopDtos = stops.stream()
                .map(s -> TripDetailResponse.StopItemResponse.builder()
                        .stopOrder(s.getStopOrder())
                        .hubCode(s.getHubCode())
                        .hubName(hubName(hubsByCode, s.getHubCode()))
                        .hubAddress(hubAddress(hubsByCode, s.getHubCode()))
                        .latitude(hubLatitude(hubsByCode, s.getHubCode()))
                        .longitude(hubLongitude(hubsByCode, s.getHubCode()))
                        .status(s.getStatus())
                        .arrivedAt(s.getArrivedAt())
                        .departedAt(s.getDepartedAt())
                        .build())
                .collect(Collectors.toList());

        List<TripDetailResponse.ManifestItemResponse> manifestDtos = manifests.stream()
                .map(m -> TripDetailResponse.ManifestItemResponse.builder()
                        .trackingCode(m.getTrackingCode())
                        .originHub(m.getOriginHub())
                        .originHubName(hubName(hubsByCode, m.getOriginHub()))
                        .originHubAddress(hubAddress(hubsByCode, m.getOriginHub()))
                        .destinationHub(m.getDestinationHub())
                        .destinationHubName(hubName(hubsByCode, m.getDestinationHub()))
                        .destinationHubAddress(hubAddress(hubsByCode, m.getDestinationHub()))
                        .pickupLocationCode(m.getPickupLocationCode())
                        .dropoffLocationCode(m.getDropoffLocationCode())
                        .transportLeg(m.getTransportLeg())
                        .weightKg(m.getWeightKg())
                        .serviceType(m.getServiceType())
                        .status(m.getStatus())
                        .loadedAt(m.getLoadedAt())
                        .unloadedAt(m.getUnloadedAt())
                        .build())
                .collect(Collectors.toList());

        Double currentWeight = trip.getCurrentWeight() != null ? trip.getCurrentWeight() : 0.0;
        Double maxWeight = trip.getMaxWeight() != null ? trip.getMaxWeight() : 5000.0;
        Double weightPercentage = maxWeight > 0 ? Math.round((currentWeight / maxWeight) * 10000.0) / 100.0 : 0.0;

        boolean isOverdue = false;
        if ("SCHEDULED".equals(trip.getStatus()) && trip.getScheduledDepartureTime() != null) {
            isOverdue = LocalDateTime.now().isAfter(trip.getScheduledDepartureTime());
        }
        boolean ready = Boolean.TRUE.equals(trip.getReadyToDepart()) || weightPercentage >= 80.0
                || (trip.getCutoffTime() != null && LocalDateTime.now().isAfter(trip.getCutoffTime()));

        return TripDetailResponse.builder()
                .id(trip.getId())
                .tripCode(trip.getTripCode())
                .driverName(trip.getDriverName())
                .vehiclePlate(trip.getVehiclePlate())
                .routeName(trip.getRouteName())
                .maxWeight(maxWeight)
                .currentWeight(currentWeight)
                .totalShipments(manifests.size())
                .currentHub(trip.getCurrentHub())
                .tripType(trip.getTripType())
                .status(trip.getStatus())
                .currentLatitude(trip.getCurrentLatitude())
                .currentLongitude(trip.getCurrentLongitude())
                .lastProgressAt(trip.getLastProgressAt())
                .progressPercent(trip.getProgressPercent())
                .departureTime(trip.getDepartureTime())
                .scheduledDepartureTime(trip.getScheduledDepartureTime())
                .cutoffTime(trip.getCutoffTime())
                .readyToDepart(ready)
                .isOverdue(isOverdue)
                .createdAt(trip.getCreatedAt())
                .weightPercentage(weightPercentage)
                .stops(stopDtos)
                .manifests(manifestDtos)
                .build();
    }

    private Hub findHub(Map<String, Hub> hubsByCode, String code) {
        Hub direct = hubsByCode.get(code);
        return direct != null ? direct : hubsByCode.get(normalizeHubCode(code));
    }

    private String hubName(Map<String, Hub> hubsByCode, String code) {
        Hub hub = findHub(hubsByCode, code);
        return hub != null ? hub.getHubName() : code;
    }

    private String hubAddress(Map<String, Hub> hubsByCode, String code) {
        Hub hub = findHub(hubsByCode, code);
        return hub != null ? hub.getAddress() : null;
    }

    private Double hubLatitude(Map<String, Hub> hubsByCode, String code) {
        Hub hub = findHub(hubsByCode, code);
        return hub != null ? hub.getLatitude() : null;
    }

    private Double hubLongitude(Map<String, Hub> hubsByCode, String code) {
        Hub hub = findHub(hubsByCode, code);
        return hub != null ? hub.getLongitude() : null;
    }

    @Override
    @Transactional(readOnly = true)
    public List<TripDetailResponse> getAllTrips() {
        List<Trip> trips = tripRepository.findAllByOrderByCreatedAtDesc();
        return trips.stream()
                .map(trip -> getTripDetail(trip.getId()))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public TripDetailResponse autoConsolidate(Long tripId, ConsolidateRequest request) {
        log.info("Bắt đầu chạy thuật toán gom đơn cho chuyến xe: {}", tripId);
        Trip trip = tripRepository.findById(tripId).orElseThrow(
                () -> new IllegalArgumentException("Không tìm thấy chuyến đi: " + tripId));

        if (!"SCHEDULED".equals(trip.getStatus())) {
            throw new IllegalStateException("Chỉ có thể gom đơn cho chuyến đi ở trạng thái SCHEDULED.");
        }

        if (request == null && trip.getCutoffTime() != null && LocalDateTime.now().isAfter(trip.getCutoffTime())) {
            log.info("Chuyến xe {} đã qua thời điểm Cut-off ({}), khóa sổ nạp hàng.", trip.getTripCode(), trip.getCutoffTime());
            trip.setReadyToDepart(true);
            tripRepository.save(trip);
            return getTripDetail(trip.getId());
        }

        List<TripStop> stops = tripStopRepository.findByTripIdOrderByStopOrder(tripId);

        if (stops == null || stops.size() < 2) {
            throw new IllegalStateException("Chuyến đi phải có ít nhất 2 điểm dừng để gom đơn.");
        }

        Map<String, Integer> stopOrderMap = new java.util.HashMap<>();
        for (TripStop stop : stops) {
            stopOrderMap.put(stop.getHubCode(), stop.getStopOrder());
            stopOrderMap.put(normalizeHubCode(stop.getHubCode()), stop.getStopOrder());
        }

        Double currentWeight = tripManifestRepository.sumActiveWeightByTripId(tripId);
        if (currentWeight == null) {
            currentWeight = 0.0;
        }

        Double maxWeight = trip.getMaxWeight() != null ? trip.getMaxWeight() : 5000.0;

        int addedCount = 0;

        if (request != null && request.getItems() != null && !request.getItems().isEmpty()) {
            for (ConsolidateItemRequest item : request.getItems()) {
                String trackingCode = item.getTrackingCode();
                String origin = item.getOriginHub();
                String destination = item.getDestinationHub();
                Double itemWeight = item.getWeight() != null ? item.getWeight() : 1.0;

                if (!isTripTypeCompatible(trip.getTripType(), origin, destination)) {
                    continue;
                }

                Integer originOrder = stopOrderMap.get(normalizeHubCode(origin));
                Integer destinationOrder = stopOrderMap.get(normalizeHubCode(destination));

                if (originOrder == null || destinationOrder == null) {
                    continue;
                }

                if (originOrder >= destinationOrder) {
                    continue;
                }

                if (currentWeight + itemWeight > maxWeight) {
                    break;
                }

                if (tripManifestRepository.existsByTripIdAndTrackingCodeAndStatus(tripId, trackingCode, "LOADED")) {
                    continue;
                }

                TripManifest manifest = TripManifest.builder()
                        .tripId(trip.getId())
                        .trackingCode(trackingCode)
                        .originHub(origin)
                        .destinationHub(destination)
                        .pickupLocationCode(origin)
                        .dropoffLocationCode(destination)
                        .transportLeg(inferTransportLeg(origin, destination))
                        .weightKg(itemWeight)
                        .serviceType(item.getServiceType() != null ? item.getServiceType() : "EXPRESS")
                        .status("LOADED")
                        .loadedAt(LocalDateTime.now())
                        .build();

                tripManifestRepository.save(manifest);
                reserveInventoryForTrip(trip, trackingCode, origin, inferTransportLeg(origin, destination));
                routingAssignmentRepository.findByTrackingCode(trackingCode).ifPresent(ra -> {
                    ra.setStatus("CONSOLIDATED");
                    routingAssignmentRepository.save(ra);
                });

                currentWeight += itemWeight;
                addedCount++;
            }
        } else {
            List<RoutingAssignment> pendingAssignments = new ArrayList<>();
            pendingAssignments.addAll(routingAssignmentRepository.findByStatus("ASSIGNED_ORIGIN_PO"));
            pendingAssignments.addAll(routingAssignmentRepository.findByStatus("ASSIGNED"));
            pendingAssignments.addAll(routingAssignmentRepository.findByStatus("AT_SOURCE_HUB"));
            pendingAssignments.addAll(routingAssignmentRepository.findByStatus("ARRIVED_DEST_HUB"));

            pendingAssignments.sort(Comparator
                    .comparing((RoutingAssignment a) -> "EXPRESS".equalsIgnoreCase(a.getServiceType()) ? 0 : 1)
                    .thenComparing(a -> a.getAssignedAt() != null ? a.getAssignedAt() : LocalDateTime.MIN));

            for (RoutingAssignment assignment : pendingAssignments) {
                String trackingCode = assignment.getTrackingCode();
                String origin;
                String destination;

                if ("ARRIVED_DEST_HUB".equals(assignment.getStatus())) {
                    // Chặng 4: Xe Feeder phát trả (Kho Tổng đích ➔ Bưu cục con phát)
                    origin = assignment.getDestinationHub();
                    destination = assignment.getDestPostOffice();
                } else if ("AT_SOURCE_HUB".equals(assignment.getStatus())) {
                    // Chặng 3: Xe trục liên tỉnh Linehaul (Kho Tổng gốc ➔ Kho Tổng đích)
                    origin = assignment.getSourceHub();
                    destination = assignment.getDestinationHub();
                } else {
                    // Trạng thái ASSIGNED_ORIGIN_PO hoặc ASSIGNED
                    if (assignment.getOriginPostOffice() != null && !assignment.getOriginPostOffice().equalsIgnoreCase(assignment.getSourceHub())) {
                        // Chặng 2: Xe Feeder gom hàng (Bưu cục gốc ➔ Kho Tổng gốc)
                        origin = assignment.getOriginPostOffice();
                        destination = assignment.getSourceHub();
                    } else {
                        // Không có bưu cục con riêng biệt: Đi thẳng từ Kho Tổng gốc
                        origin = assignment.getSourceHub();
                        destination = assignment.getDestinationHub();
                    }
                }

                if (origin == null || destination == null) {
                    continue;
                }
                if (!isTripTypeCompatible(trip.getTripType(), origin, destination)) {
                    continue;
                }

                WarehouseInventory availableInventory = ensureLegacyInventory(assignment, origin);
                if (availableInventory == null) {
                    continue;
                }

                Double itemWeight = assignment.getWeight() != null ? assignment.getWeight() : 1.0;

                Integer originOrder = stopOrderMap.get(normalizeHubCode(origin));
                Integer destinationOrder = stopOrderMap.get(normalizeHubCode(destination));

                if (originOrder == null || destinationOrder == null) {
                    continue;
                }

                if (originOrder >= destinationOrder) {
                    continue;
                }

                if (currentWeight + itemWeight > maxWeight) {
                    log.info("Chuyến xe {} đã đạt giới hạn tải trọng ({}/{} kg)", trip.getTripCode(), currentWeight, maxWeight);
                    break;
                }

                if (tripManifestRepository.existsByTripIdAndTrackingCodeAndStatus(tripId, trackingCode, "LOADED")) {
                    continue;
                }

                TripManifest manifest = TripManifest.builder()
                        .tripId(trip.getId())
                        .trackingCode(trackingCode)
                        .originHub(origin)
                        .destinationHub(destination)
                        .pickupLocationCode(origin)
                        .dropoffLocationCode(destination)
                        .transportLeg(inferTransportLeg(origin, destination))
                        .weightKg(itemWeight)
                        .serviceType(assignment.getServiceType() != null ? assignment.getServiceType() : "EXPRESS")
                        .status("LOADED")
                        .loadedAt(LocalDateTime.now())
                        .build();

                tripManifestRepository.save(manifest);
                reserveInventoryForTrip(trip, trackingCode, origin, inferTransportLeg(origin, destination));
                assignment.setStatus("CONSOLIDATED");
                routingAssignmentRepository.save(assignment);

                currentWeight += itemWeight;
                addedCount++;
                log.info("Tự động gom kiện {} lên chuyến xe {} (Từ {} đến {})", trackingCode, trip.getTripCode(), origin, destination);
            }
        }

        trip.setCurrentWeight(currentWeight);
        trip.setTotalShipments((int) tripManifestRepository.countByTripId(tripId));
        double loadFactor = maxWeight > 0 ? (currentWeight / maxWeight) * 100.0 : 0.0;
        if (loadFactor >= 80.0 || (trip.getCutoffTime() != null && LocalDateTime.now().isAfter(trip.getCutoffTime()))) {
            trip.setReadyToDepart(true);
        }
        tripRepository.save(trip);
        log.info("Hoàn tất gom đơn cho xe {}: Đã thêm {} kiện mới. Tổng tải trọng hiện tại: {}/{} kg.",
                trip.getTripCode(), addedCount, currentWeight, maxWeight);

        return getTripDetail(trip.getId());
    }

    @Override
    @Transactional
    public int consolidateAllScheduledTrips() {
        List<Trip> scheduledTrips = tripRepository.findAll().stream()
                .filter(t -> "SCHEDULED".equals(t.getStatus()))
                .collect(Collectors.toList());

        int totalCount = 0;
        for (Trip trip : scheduledTrips) {
            try {
                TripDetailResponse detail = autoConsolidate(trip.getId(), null);
                if (detail != null && detail.getManifests() != null) {
                    totalCount += detail.getManifests().size();
                }
            } catch (Exception e) {
                log.error("Lỗi khi gom đơn tự động cho chuyến xe {}: {}", trip.getTripCode(), e.getMessage());
            }
        }
        return totalCount;
    }

    @Override
    @Transactional
    public TripDetailResponse removeManifestItem(Long tripId, String trackingCode) {
        log.info("Yêu cầu gỡ kiện hàng {} khỏi chuyến xe {}", trackingCode, tripId);
        Trip trip = tripRepository.findById(tripId).orElseThrow(
                () -> new IllegalArgumentException("Không tìm thấy chuyến đi: " + tripId));

        if(!"SCHEDULED".equals(trip.getStatus())) {
            throw new IllegalStateException("Chỉ có thể gỡ kiện hàng cho chuyến đi ở trạng thái lập lịch.");
        }

        List<TripManifest> manifests = tripManifestRepository.findByTripId(tripId);
        TripManifest targetManifest = manifests.stream()
                .filter(m -> m.getTrackingCode().equals(trackingCode))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy kiện hàng: " + trackingCode + " trong chuyến đi: " + tripId));

        tripManifestRepository.delete(targetManifest);
        tripManifestRepository.flush();

        routingAssignmentRepository.findByTrackingCode(trackingCode).ifPresent(ra -> {
            ra.setStatus("ASSIGNED");
            routingAssignmentRepository.save(ra);
        });

        Double updatedWeight = tripManifestRepository.sumActiveWeightByTripId(tripId);
        trip.setCurrentWeight(updatedWeight != null ? updatedWeight : 0.0);

        List<TripManifest> remainingManifests = tripManifestRepository.findByTripIdAndStatus(tripId, "LOADED");
        trip.setTotalShipments(remainingManifests.size());
        tripRepository.save(trip);
        log.info("Gỡ kiện hàng {} khỏi chuyến xe {} thành công. Tải trọng hiện tại: {}/{} kg, tổng kiện: {}.",
                trackingCode, trip.getTripCode(), trip.getCurrentWeight(), trip.getTotalShipments());
        return getTripDetail(trip.getId());
    }

    @Override
    @Transactional
    public TripDetailResponse departTrip(Long tripId) {
        Trip trip = tripRepository.findById(tripId).orElseThrow(
                () -> new IllegalArgumentException("Không tìm thấy chuyến đi: " + tripId));

        if(!"SCHEDULED".equals(trip.getStatus())) {
            throw new IllegalStateException("Chỉ có thể khởi hành chuyến đi ở trạng thái lập lịch.");
        }

        Double activeWeight = tripManifestRepository.sumActiveWeightByTripId(tripId);
        if(activeWeight == null || activeWeight <= 0) {
            throw new IllegalStateException("Chuyến đi không có kiện hàng nào để khởi hành.");
        }

        trip.setStatus("IN_TRANSIT");
        trip.setDepartureTime(LocalDateTime.now());
        trip.setReadyToDepart(false);
        List<TripStop> stops = tripStopRepository.findByTripIdOrderByStopOrder(tripId);
        if(stops == null || stops.isEmpty()) {
            throw new IllegalStateException("Chuyến đi phải có ít nhất 1 điểm dừng để khởi hành.");
        }

        TripStop firstStop = stops.get(0);
        firstStop.setStatus("DEPARTED");
        firstStop.setDepartedAt(LocalDateTime.now());
        tripStopRepository.save(firstStop);
        trip.setCurrentHub(firstStop.getHubCode());
        tripRepository.save(trip);

        List<TripManifest> loadedManifests = tripManifestRepository.findByTripIdAndStatus(tripId, "LOADED");
        LocalDateTime departureAt = trip.getDepartureTime();
        trip.setProgressPercent(0.0);
        trip.setLastProgressAt(departureAt);
        Map<String, Hub> departureHubs = hubRepository.findAll().stream()
                .collect(Collectors.toMap(Hub::getHubCode, hub -> hub, (first, ignored) -> first));
        Hub departureHub = findHub(departureHubs, firstStop.getHubCode());
        if (departureHub != null) {
            trip.setCurrentLatitude(departureHub.getLatitude());
            trip.setCurrentLongitude(departureHub.getLongitude());
        }
        tripRepository.save(trip);
        for (TripManifest item : loadedManifests) {
            try {
                WarehouseInventory inventory = warehouseInventoryRepository.findByTrackingCode(item.getTrackingCode())
                        .orElseGet(() -> createLegacyInventory(item));
                inventory.setInventoryStatus("LOADED");
                inventory.setActiveTripId(trip.getId());
                inventory.setLoadedAt(departureAt);
                inventory.setUpdatedAt(departureAt);
                warehouseInventoryRepository.save(inventory);
                boolean isFeeder = (firstStop.getHubCode() != null && firstStop.getHubCode().toUpperCase().startsWith("HUB-"))
                        && (item.getDestinationHub() != null && item.getDestinationHub().toUpperCase().startsWith("POST-"));
                String note = isFeeder
                        ? String.format("Chuyến xe trung chuyển nội đô %s (BKS: %s, Tài xế: %s) đã xuất bến từ %s về bưu cục phát %s. Bưu phẩm đang trên đường trung chuyển.",
                                trip.getTripCode(), trip.getVehiclePlate(), trip.getDriverName(), firstStop.getHubCode(), item.getDestinationHub())
                        : String.format("Chuyến xe %s (BKS: %s, Tài xế: %s) đã xuất bến từ %s. Bưu phẩm đang trên đường vận chuyển.",
                                trip.getTripCode(), trip.getVehiclePlate(), trip.getDriverName(), firstStop.getHubCode());

                ShipmentStatusUpdatedEvent statusEvent = ShipmentStatusUpdatedEvent.builder()
                        .trackingCode(item.getTrackingCode())
                        .status("IN_TRANSIT")
                        .locationCode(firstStop.getHubCode())
                        .note(note)
                        .updateAt(LocalDateTime.now().toString())
                        .build();
                kafkaTemplate.send("tracking-status-events", item.getTrackingCode(), statusEvent);
                recordLifecycle(item.getTrackingCode(), "IN_TRANSIT", OperationType.DEPARTED,
                        inferTransportLeg(item.getPickupLocationCode(), item.getDropoffLocationCode()),
                        firstStop.getHubCode(), trip.getTripCode(), null, note, departureAt,
                        "DEPART:" + trip.getTripCode() + ":" + item.getTrackingCode());
            } catch (Exception e) {
                log.error("Lỗi gửi event IN_TRANSIT khi xuất bến cho kiện {}: {}", item.getTrackingCode(), e.getMessage());
            }
        }

        log.info("Chuyến xe {} đã xuất bến thành công lúc {}. Đã đồng bộ IN_TRANSIT cho {} kiện hàng.", trip.getTripCode(),
                trip.getDepartureTime(), loadedManifests.size());
        return getTripDetail(trip.getId());
    }

    @Override
    @Transactional
    public TripDetailResponse arriveAtStop(Long tripId, String hubCode) {
        Trip trip = tripRepository.findById(tripId).orElseThrow(
                () -> new IllegalArgumentException("Không tìm thấy chuyến xe: " + tripId));

        if(!"IN_TRANSIT".equals(trip.getStatus())) {
            throw new IllegalStateException("Chuyến xe chưa xuất bến hoặc đã kết thúc.");
        }

        List<TripStop> stops = tripStopRepository.findByTripIdOrderByStopOrder(tripId);

        if(stops == null || stops.isEmpty()) {
            throw new IllegalStateException("Chuyến xe phải có ít nhất 1 điểm dừng.");
        }

        String targetHubCode = normalizeHubCode(hubCode);
        TripStop currentStop = stops.stream()
                .filter(s -> targetHubCode.equalsIgnoreCase(s.getHubCode()) || (hubCode != null && hubCode.equalsIgnoreCase(s.getHubCode())))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy điểm dừng: " + hubCode + " trong chuyến xe: " + tripId));

        // 1. Chặn cập bến tại trạm xuất phát (Trạm xuất phát chỉ có quyền xuất bến)
        if (currentStop.getStopOrder() == 1 || "DEPARTED".equalsIgnoreCase(currentStop.getStatus())) {
            throw new IllegalStateException("Trạm xuất phát (" + currentStop.getHubCode() + ") đã xuất bến. Không thể xác nhận cập bến tại trạm xuất phát.");
        }

        // 2. Chặn xác nhận cập bến trùng lặp
        if ("ARRIVED".equalsIgnoreCase(currentStop.getStatus())) {
            throw new IllegalStateException("Chuyến xe đã cập bến tại trạm " + currentStop.getHubCode() + " trước đó.");
        }

        // 3. Chặn nhảy cóc trạm dừng (Bắt buộc phải đi tuần tự theo lộ trình stopOrder)
        for (TripStop stop : stops) {
            if (stop.getStopOrder() < currentStop.getStopOrder()
                    && !"ARRIVED".equalsIgnoreCase(stop.getStatus())
                    && !"DEPARTED".equalsIgnoreCase(stop.getStatus())) {
                throw new IllegalStateException(String.format(
                        "Chuyến xe chưa thể cập bến tại %s vì chưa hoàn tất tại trạm trung gian trước đó (%s, thứ tự dừng #%d).",
                        currentStop.getHubCode(), stop.getHubCode(), stop.getStopOrder()));
            }
        }

        // 4. Chuyển các trạm trung gian trước đó sang trạng thái DEPARTED (đã rời trạm để đến trạm tiếp theo)
        for (TripStop stop : stops) {
            if (stop.getStopOrder() < currentStop.getStopOrder() && "ARRIVED".equalsIgnoreCase(stop.getStatus())) {
                stop.setStatus("DEPARTED");
                stop.setDepartedAt(LocalDateTime.now());
                tripStopRepository.save(stop);
            }
        }

        LocalDateTime arrivalAt = LocalDateTime.now();
        currentStop.setStatus("ARRIVED");
        currentStop.setArrivedAt(arrivalAt);
        tripStopRepository.save(currentStop);
        trip.setCurrentHub(currentStop.getHubCode());
        double progressPercent = stops.size() <= 1 ? 100.0
                : ((double) (currentStop.getStopOrder() - 1) / (double) (stops.size() - 1)) * 100.0;
        trip.setProgressPercent(Math.max(0.0, Math.min(100.0, progressPercent)));
        trip.setLastProgressAt(arrivalAt);
        Map<String, Hub> hubsByCode = hubRepository.findAll().stream()
                .collect(Collectors.toMap(Hub::getHubCode, hub -> hub, (first, ignored) -> first));
        Hub arrivalHub = findHub(hubsByCode, currentStop.getHubCode());
        if (arrivalHub != null) {
            trip.setCurrentLatitude(arrivalHub.getLatitude());
            trip.setCurrentLongitude(arrivalHub.getLongitude());
        }
        // Gỡ các kiện hàng có điểm đến là điểm dừng hiện tại, và đồng bộ trạm trung gian cho các kiện còn lại
        List<TripManifest> manifests = tripManifestRepository.findByTripId(tripId);
        int unloadedCount = 0;

        for (TripManifest item : manifests) {
            String itemDest = normalizeHubCode(item.getDestinationHub());
            if ("LOADED".equals(item.getStatus())) {
                if (currentStop.getHubCode().equalsIgnoreCase(itemDest)) {
                    item.setStatus("UNLOADED");
                    item.setUnloadedAt(arrivalAt);
                    tripManifestRepository.save(item);
                    WarehouseInventory inventory = warehouseInventoryRepository.findByTrackingCode(item.getTrackingCode())
                            .orElseGet(() -> createLegacyInventory(item));
                    inventory.setLocationCode(currentStop.getHubCode());
                    inventory.setInventoryStatus("STORED");
                    inventory.setActiveTripId(null);
                    inventory.setStoredAt(arrivalAt);
                    inventory.setUpdatedAt(arrivalAt);
                    warehouseInventoryRepository.save(inventory);
                    unloadedCount++;

                    RoutingAssignment raOpt = routingAssignmentRepository.findByTrackingCode(item.getTrackingCode()).orElse(null);
                    boolean isSourceHub = raOpt != null 
                            && currentStop.getHubCode().equalsIgnoreCase(raOpt.getSourceHub())
                            && !currentStop.getHubCode().equalsIgnoreCase(raOpt.getDestinationHub());
                    boolean isPostOffice = currentStop.getHubCode().toUpperCase().startsWith("POST-");

                    String note;
                    String newShipmentStatus;
                    OperationType operationType = OperationType.UNLOADED;
                    if (isSourceHub) {
                        note = String.format("Chuyến xe trung chuyển gom hàng %s đã cập bến Kho Tổng gốc %s. Kiện hàng đã dỡ vào kho bãi, sẵn sàng đóng chuyến xe trục liên tỉnh.", trip.getTripCode(), currentStop.getHubCode());
                        // IN_TRANSIT -> PICKED_UP là chuyển ngược state machine; chỉ ghi
                        // operational event UNLOADED và giữ nguyên trạng thái rộng.
                        newShipmentStatus = "IN_TRANSIT";
                    } else if (isPostOffice) {
                        note = String.format("Chuyến xe %s đã cập bến Bưu cục phát con %s. Kiện hàng đã được dỡ an toàn vào bưu cục, sẵn sàng giao bưu tá.", trip.getTripCode(), currentStop.getHubCode());
                        newShipmentStatus = "ARRIVED_DEST_HUB";
                    } else {
                        note = String.format("Chuyến xe %s đã cập bến Kho Tổng Đích %s. Kiện hàng đã được dỡ an toàn vào kho bãi, chờ trung chuyển về bưu cục phát.", trip.getTripCode(), currentStop.getHubCode());
                        newShipmentStatus = "ARRIVED_DEST_HUB";
                    }

                    ShipmentStatusUpdatedEvent statusEvent = ShipmentStatusUpdatedEvent.builder()
                            .trackingCode(item.getTrackingCode())
                            .status(newShipmentStatus)
                            .locationCode(currentStop.getHubCode())
                            .note(note)
                            .updateAt(LocalDateTime.now().toString())
                            .build();
                    kafkaTemplate.send("tracking-status-events", item.getTrackingCode(), statusEvent);
                    recordLifecycle(item.getTrackingCode(), newShipmentStatus, operationType,
                            item.getTransportLeg() != null ? item.getTransportLeg() : inferTransportLeg(item.getPickupLocationCode(), item.getDropoffLocationCode()),
                            currentStop.getHubCode(), trip.getTripCode(), null, note, arrivalAt,
                            "UNLOAD:" + trip.getTripCode() + ":" + item.getTrackingCode() + ":" + currentStop.getHubCode());

                    // Cập nhật trạng thái RoutingAssignment để sẵn sàng cho chặng tiếp theo
                    if (raOpt != null) {
                        if (isSourceHub) {
                            raOpt.setStatus("AT_SOURCE_HUB"); // Sẵn sàng gom vào xe trục liên tỉnh
                        } else if (isPostOffice) {
                            raOpt.setStatus("ARRIVED_POST_OFFICE"); // Sẵn sàng cho bưu tá nhận đi phát
                        } else if (raOpt.getDestPostOffice() != null && !raOpt.getDestPostOffice().equalsIgnoreCase(raOpt.getDestinationHub())) {
                            raOpt.setStatus("ARRIVED_DEST_HUB"); // Sẵn sàng gom vào xe Feeder phát
                        } else {
                            raOpt.setStatus("ARRIVED_POST_OFFICE");
                        }
                        routingAssignmentRepository.save(raOpt);
                    }
                } else {
                    ShipmentStatusUpdatedEvent transitEvent = ShipmentStatusUpdatedEvent.builder()
                            .trackingCode(item.getTrackingCode())
                            .status("IN_TRANSIT")
                            .locationCode(currentStop.getHubCode())
                            .note(String.format("Chuyến xe %s đã cập bến trạm trung chuyển %s (%s). Bưu phẩm đang lưu thông qua trạm.",
                                    trip.getTripCode(), currentStop.getHubCode(), hubName(hubsByCode, currentStop.getHubCode())))
                            .updateAt(LocalDateTime.now().toString())
                            .build();
                    kafkaTemplate.send("tracking-status-events", item.getTrackingCode(), transitEvent);
                    recordLifecycle(item.getTrackingCode(), "IN_TRANSIT", OperationType.ARRIVED,
                            item.getTransportLeg() != null ? item.getTransportLeg() : inferTransportLeg(item.getPickupLocationCode(), item.getDropoffLocationCode()),
                            currentStop.getHubCode(), trip.getTripCode(), null, transitEvent.getNote(), arrivalAt,
                            "ARRIVE:" + trip.getTripCode() + ":" + item.getTrackingCode() + ":" + currentStop.getHubCode());
                }
            }
        }



        Double remainingWeight = tripManifestRepository.sumActiveWeightByTripId(tripId);
        trip.setCurrentWeight(remainingWeight != null ? remainingWeight : 0.0);

        long activeCount = manifests.stream().filter(m -> "LOADED".equals(m.getStatus())).count();
        trip.setTotalShipments((int) activeCount);

        TripStop finalStop = stops.get(stops.size() - 1);
        if (finalStop.getHubCode().equalsIgnoreCase(currentStop.getHubCode())) {
            trip.setStatus("COMPLETED");
            log.info("Chuyến xe {} đã hoàn tất tại điểm dừng cuối cùng: {}.", trip.getTripCode(), currentStop.getHubCode());
        } else {
            log.info("Chuyến xe {} đã đến điểm dừng: {}. Số kiện hàng đã gỡ: {}. Tải trọng hiện tại: {}/{} kg.",
                    trip.getTripCode(), currentStop.getHubCode(), unloadedCount, trip.getCurrentWeight(), trip.getMaxWeight());
        }

        tripRepository.save(trip);
        return getTripDetail(trip.getId());
    }

    @Override
    @Transactional(readOnly = true)
    public List<EligibleAssignmentResponse> getEligibleAssignmentsForTrip(Long tripId) {
        Trip trip = tripRepository.findById(tripId).orElseThrow(
                () -> new IllegalArgumentException("Không tìm thấy chuyến xe: " + tripId));

        List<TripStop> stops = tripStopRepository.findByTripIdOrderByStopOrder(tripId);
        if (stops == null || stops.size() < 2) {
            return Collections.emptyList();
        }

        Map<String, Integer> stopOrderMap = new java.util.HashMap<>();
        for (TripStop stop : stops) {
            stopOrderMap.put(stop.getHubCode(), stop.getStopOrder());
            stopOrderMap.put(normalizeHubCode(stop.getHubCode()), stop.getStopOrder());
        }

        List<RoutingAssignment> pending = new ArrayList<>();
        pending.addAll(routingAssignmentRepository.findByStatus("ASSIGNED_ORIGIN_PO"));
        pending.addAll(routingAssignmentRepository.findByStatus("ASSIGNED"));
        pending.addAll(routingAssignmentRepository.findByStatus("AT_SOURCE_HUB"));
        pending.addAll(routingAssignmentRepository.findByStatus("ARRIVED_DEST_HUB"));

        List<EligibleAssignmentResponse> result = new ArrayList<>();

        for (RoutingAssignment a : pending) {
            String trackingCode = a.getTrackingCode();
            if (tripManifestRepository.existsByTripIdAndTrackingCodeAndStatus(tripId, trackingCode, "LOADED")) {
                continue;
            }

            String origin;
            String destination;

            if ("ARRIVED_DEST_HUB".equals(a.getStatus())) {
                // Chặng 4: Xe Feeder phát trả (Kho Tổng đích ➔ Bưu cục con phát)
                origin = a.getDestinationHub();
                destination = a.getDestPostOffice();
            } else if ("AT_SOURCE_HUB".equals(a.getStatus())) {
                // Chặng 3: Xe trục liên tỉnh Linehaul (Kho Tổng gốc ➔ Kho Tổng đích)
                origin = a.getSourceHub();
                destination = a.getDestinationHub();
            } else {
                // Trạng thái ASSIGNED_ORIGIN_PO hoặc ASSIGNED
                if (a.getOriginPostOffice() != null && !a.getOriginPostOffice().equalsIgnoreCase(a.getSourceHub())) {
                    // Chặng 2: Xe Feeder gom hàng (Bưu cục gốc ➔ Kho Tổng gốc)
                    origin = a.getOriginPostOffice();
                    destination = a.getSourceHub();
                } else {
                    // Không có bưu cục con riêng biệt: Đi thẳng từ Kho Tổng gốc
                    origin = a.getSourceHub();
                    destination = a.getDestinationHub();
                }
            }

            if (origin == null || destination == null) {
                continue;
            }
            if (!isTripTypeCompatible(trip.getTripType(), origin, destination)) {
                continue;
            }
            WarehouseInventory inventory = warehouseInventoryRepository.findByTrackingCode(trackingCode).orElse(null);
            if (inventory != null && (!normalizeHubCode(origin).equalsIgnoreCase(inventory.getLocationCode())
                    || !List.of("RECEIVED", "STORED").contains(inventory.getInventoryStatus()))) {
                continue;
            }

            Integer originOrder = stopOrderMap.get(normalizeHubCode(origin));
            Integer destinationOrder = stopOrderMap.get(normalizeHubCode(destination));

            if (originOrder != null && destinationOrder != null && originOrder < destinationOrder) {
                result.add(EligibleAssignmentResponse.builder()
                        .trackingCode(trackingCode)
                        .sourceHub(origin)
                        .destinationHub(destination)
                        .weight(a.getWeight() != null ? a.getWeight() : 1.0)
                        .serviceType(a.getServiceType() != null ? a.getServiceType() : "EXPRESS")
                        .assignedAt(a.getAssignedAt())
                        .build());
            }
        }

        result.sort(Comparator
                .comparing((EligibleAssignmentResponse r) -> "EXPRESS".equalsIgnoreCase(r.getServiceType()) ? 0 : 1)
                .thenComparing(r -> r.getAssignedAt() != null ? r.getAssignedAt() : LocalDateTime.MIN));

        return result;
    }

    private boolean isTripTypeCompatible(TripType tripType, String origin, String destination) {
        TripType expected = inferTripType(origin, destination);
        return tripType == null || tripType == expected;
    }

    private WarehouseInventory ensureLegacyInventory(RoutingAssignment assignment, String origin) {
        String trackingCode = assignment.getTrackingCode();
        WarehouseInventory inventory = warehouseInventoryRepository.findByTrackingCode(trackingCode).orElse(null);
        if (inventory == null) {
            inventory = WarehouseInventory.builder()
                    .trackingCode(trackingCode)
                    .locationCode(origin)
                    .inventoryStatus("STORED")
                    .transportLeg(inferTransportLeg(origin, assignment.getDestinationHub()))
                    .storedAt(LocalDateTime.now())
                    .updatedAt(LocalDateTime.now())
                    .build();
            return warehouseInventoryRepository.save(inventory);
        }
        if (!origin.equalsIgnoreCase(inventory.getLocationCode())
                || !List.of("RECEIVED", "STORED").contains(inventory.getInventoryStatus())) {
            return null;
        }
        if ("RECEIVED".equals(inventory.getInventoryStatus())) {
            inventory.setInventoryStatus("STORED");
            inventory.setStoredAt(LocalDateTime.now());
            inventory.setUpdatedAt(LocalDateTime.now());
            warehouseInventoryRepository.save(inventory);
        }
        return inventory;
    }

    private WarehouseInventory createLegacyInventory(TripManifest manifest) {
        LocalDateTime now = LocalDateTime.now();
        return warehouseInventoryRepository.save(WarehouseInventory.builder()
                .trackingCode(manifest.getTrackingCode())
                .locationCode(manifest.getPickupLocationCode() != null ? manifest.getPickupLocationCode() : manifest.getOriginHub())
                .inventoryStatus("STORED")
                .transportLeg(manifest.getTransportLeg() != null ? manifest.getTransportLeg()
                        : inferTransportLeg(manifest.getOriginHub(), manifest.getDestinationHub()))
                .storedAt(now)
                .updatedAt(now)
                .build());
    }

    private void reserveInventoryForTrip(Trip trip, String trackingCode, String pickupLocation, TransportLeg transportLeg) {
        WarehouseInventory inventory = warehouseInventoryRepository.findByTrackingCode(trackingCode).orElse(null);
        if (inventory == null) {
            inventory = WarehouseInventory.builder()
                    .trackingCode(trackingCode)
                    .locationCode(pickupLocation)
                    .inventoryStatus("STORED")
                    .build();
        }
        if (!pickupLocation.equalsIgnoreCase(inventory.getLocationCode())) {
            throw new IllegalStateException(String.format("Bưu gửi %s đang ở %s, không thể gom tại %s",
                    trackingCode, inventory.getLocationCode(), pickupLocation));
        }
        if (!List.of("RECEIVED", "STORED").contains(inventory.getInventoryStatus())) {
            throw new IllegalStateException("Bưu gửi " + trackingCode + " chưa ở trạng thái sẵn sàng gom");
        }
        LocalDateTime now = LocalDateTime.now();
        inventory.setInventoryStatus("RESERVED");
        inventory.setActiveTripId(trip.getId());
        inventory.setTransportLeg(transportLeg);
        inventory.setReservedAt(now);
        inventory.setUpdatedAt(now);
        warehouseInventoryRepository.save(inventory);
        recordLifecycle(trackingCode, "IN_TRANSIT", OperationType.RESERVED_FOR_TRIP, transportLeg,
                pickupLocation, trip.getTripCode(), null,
                "Đã giữ chỗ bưu gửi cho chuyến xe " + trip.getTripCode(), now,
                "RESERVE:" + trip.getTripCode() + ":" + trackingCode);
    }

    private void recordLifecycle(String trackingCode, String status, OperationType operationType,
                                 TransportLeg transportLeg, String locationCode, String tripCode,
                                 String actorId, String note, LocalDateTime occurredAt, String eventId) {
        if (handlingEventRepository.existsByOperationId(eventId)) return;
        handlingEventRepository.save(HandlingEvent.builder()
                .operationId(eventId)
                .trackingCode(trackingCode)
                .operationType(operationType)
                .transportLeg(transportLeg)
                .locationCode(locationCode)
                .tripCode(tripCode)
                .actorId(actorId)
                .note(note)
                .occurredAt(occurredAt)
                .build());
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

    @Override
    @Transactional
    public TripDetailResponse updateProgress(Long tripId, TripProgressRequest request, String actorId,
                                             String roles, String permissions) {
        if (request == null) {
            throw new IllegalArgumentException("Dữ liệu cập nhật chuyến không được để trống");
        }
        String normalizedRoles = roles == null ? "" : roles.toUpperCase();
        String normalizedPermissions = permissions == null ? "" : permissions.toLowerCase();
        boolean allowed = normalizedRoles.contains("ADMIN")
                || normalizedRoles.contains("DISPATCHER")
                || normalizedRoles.contains("ROLE_HUB_OPERATOR")
                || normalizedPermissions.contains("routing:trip_manage");
        if (!allowed) {
            throw new SecurityException("Không có quyền cập nhật tiến độ chuyến xe");
        }

        Trip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy chuyến đi: " + tripId));
        if ("COMPLETED".equalsIgnoreCase(trip.getStatus())) {
            throw new IllegalStateException("Chuyến xe đã hoàn tất, không thể cập nhật tiến độ");
        }

        String locationCode = request.getLocationCode() != null && !request.getLocationCode().isBlank()
                ? normalizeHubCode(request.getLocationCode()) : trip.getCurrentHub();
        if (locationCode != null && !locationCode.isBlank()) {
            boolean isStop = tripStopRepository.findByTripIdOrderByStopOrder(tripId).stream()
                    .anyMatch(stop -> normalizeHubCode(stop.getHubCode()).equalsIgnoreCase(locationCode));
            if (!isStop && (request.getLatitude() == null || request.getLongitude() == null)) {
                throw new IllegalArgumentException("Vị trí cập nhật không thuộc lộ trình chuyến xe");
            }
        }

        Double progress = request.getProgressPercent();
        if (progress != null && trip.getProgressPercent() != null && progress < trip.getProgressPercent()) {
            throw new IllegalArgumentException("Tiến độ chuyến xe không được giảm");
        }
        LocalDateTime now = LocalDateTime.now();
        trip.setCurrentHub(locationCode);
        if (request.getLatitude() != null) trip.setCurrentLatitude(request.getLatitude());
        if (request.getLongitude() != null) trip.setCurrentLongitude(request.getLongitude());
        if (progress != null) trip.setProgressPercent(progress);
        trip.setLastProgressAt(now);
        tripRepository.save(trip);

        String eventId = request.getOperationId() != null && !request.getOperationId().isBlank()
                ? request.getOperationId().trim() : UUID.randomUUID().toString();
        kafkaTemplate.send("trip-progress-events", trip.getTripCode(), TripProgressEvent.builder()
                .eventId(eventId)
                .tripCode(trip.getTripCode())
                .locationCode(locationCode)
                .currentLatitude(trip.getCurrentLatitude())
                .currentLongitude(trip.getCurrentLongitude())
                .progressPercent(trip.getProgressPercent())
                .vehiclePlate(trip.getVehiclePlate())
                .actorId(actorId)
                .note(request.getNote())
                .occurredAt(now)
                .build());
        return getTripDetail(tripId);
    }
}
