package org.app.routingservice.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.app.routingservice.dto.trip.ConsolidateItemRequest;
import org.app.routingservice.dto.trip.ConsolidateRequest;
import org.app.routingservice.dto.trip.CreateTripRequest;
import org.app.routingservice.dto.trip.EligibleAssignmentResponse;
import org.app.routingservice.dto.trip.TripDetailResponse;
import org.app.routingservice.entity.Hub;
import org.app.routingservice.entity.RoutingAssignment;
import org.app.routingservice.entity.Trip;
import org.app.routingservice.entity.TripManifest;
import org.app.routingservice.entity.TripStop;
import org.app.routingservice.repository.HubRepository;
import org.app.routingservice.repository.RoutingAssignmentRepository;
import org.app.routingservice.repository.TripManifestRepository;
import org.app.routingservice.repository.TripRepository;
import org.app.routingservice.repository.TripStopRepository;
import org.app.routingservice.service.TripService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

        Trip trip = Trip.builder()
                .tripCode(tripCode)
                .driverName(request.getDriverName())
                .vehiclePlate(request.getVehiclePlate())
                .routeName(request.getRouteName())
                .maxWeight(request.getMaxWeight() != null ? request.getMaxWeight() : 5000.0)
                .currentWeight(0.0)
                .totalShipments(0)
                .currentHub(originHub)
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
        List<TripManifest> manifests = tripManifestRepository.findByTripId(tripId);

        List<TripDetailResponse.StopItemResponse> stopDtos = stops.stream()
                .map(s -> TripDetailResponse.StopItemResponse.builder()
                        .stopOrder(s.getStopOrder())
                        .hubCode(s.getHubCode())
                        .status(s.getStatus())
                        .arrivedAt(s.getArrivedAt())
                        .departedAt(s.getDepartedAt())
                        .build())
                .collect(Collectors.toList());

        List<TripDetailResponse.ManifestItemResponse> manifestDtos = manifests.stream()
                .map(m -> TripDetailResponse.ManifestItemResponse.builder()
                        .trackingCode(m.getTrackingCode())
                        .originHub(m.getOriginHub())
                        .destinationHub(m.getDestinationHub())
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
                .status(trip.getStatus())
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

                if (tripManifestRepository.existsByTripIdAndTrackingCode(tripId, trackingCode)) {
                    continue;
                }

                TripManifest manifest = TripManifest.builder()
                        .tripId(trip.getId())
                        .trackingCode(trackingCode)
                        .originHub(origin)
                        .destinationHub(destination)
                        .weightKg(itemWeight)
                        .serviceType(item.getServiceType() != null ? item.getServiceType() : "EXPRESS")
                        .status("LOADED")
                        .loadedAt(LocalDateTime.now())
                        .build();

                tripManifestRepository.save(manifest);
                routingAssignmentRepository.findByTrackingCode(trackingCode).ifPresent(ra -> {
                    ra.setStatus("CONSOLIDATED");
                    routingAssignmentRepository.save(ra);
                });

                currentWeight += itemWeight;
                addedCount++;
            }
        } else {
            List<RoutingAssignment> pendingAssignments = new ArrayList<>(routingAssignmentRepository.findByStatus("ASSIGNED"));
            pendingAssignments.sort(Comparator
                    .comparing((RoutingAssignment a) -> "EXPRESS".equalsIgnoreCase(a.getServiceType()) ? 0 : 1)
                    .thenComparing(a -> a.getAssignedAt() != null ? a.getAssignedAt() : LocalDateTime.MIN));

            for (RoutingAssignment assignment : pendingAssignments) {
                String trackingCode = assignment.getTrackingCode();
                String origin = assignment.getSourceHub();
                String destination = assignment.getDestinationHub();
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

                if (tripManifestRepository.existsByTripIdAndTrackingCode(tripId, trackingCode)) {
                    continue;
                }

                TripManifest manifest = TripManifest.builder()
                        .tripId(trip.getId())
                        .trackingCode(trackingCode)
                        .originHub(origin)
                        .destinationHub(destination)
                        .weightKg(itemWeight)
                        .serviceType(assignment.getServiceType() != null ? assignment.getServiceType() : "EXPRESS")
                        .status("LOADED")
                        .loadedAt(LocalDateTime.now())
                        .build();

                tripManifestRepository.save(manifest);
                assignment.setStatus("CONSOLIDATED");
                routingAssignmentRepository.save(assignment);

                currentWeight += itemWeight;
                addedCount++;
                log.info("Tự động gom kiện {} lên chuyến xe {}", trackingCode, trip.getTripCode());
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

        targetManifest.setStatus("REMOVED");
        targetManifest.setUnloadedAt(LocalDateTime.now());
        tripManifestRepository.save(targetManifest);

        routingAssignmentRepository.findByTrackingCode(trackingCode).ifPresent(ra -> {
            ra.setStatus("ASSIGNED");
            routingAssignmentRepository.save(ra);
        });

        Double updatedWeight = tripManifestRepository.sumActiveWeightByTripId(tripId);
        trip.setCurrentWeight(updatedWeight != null ? updatedWeight : 0.0);

        long activeCount = manifests.stream().filter(m -> "LOADED".equals(m.getStatus()) && !m.getId().equals(targetManifest.getId())).count();

        trip.setTotalShipments((int) activeCount);
        tripRepository.save(trip);
        log.info("Gỡ kiện hàng {} khỏi chuyến xe {} thành công. Tải trọng hiện tại: {}/{} kg.", trackingCode, trip.getTripCode(), trip.getCurrentWeight(), trip.getMaxWeight());
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

        log.info("Chuyến xe {} đã xuất bến thành công lúc {}.", trip.getTripCode(),
                trip.getDepartureTime());
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
        currentStop.setStatus("ARRIVED");
        currentStop.setArrivedAt(LocalDateTime.now());
        tripStopRepository.save(currentStop);
        trip.setCurrentHub(currentStop.getHubCode());

        // Gỡ các kiện hàng có điểm đến là điểm dừng hiện tại
        List<TripManifest> manifests = tripManifestRepository.findByTripId(tripId);
        int unloadedCount = 0;

        for (TripManifest item : manifests) {
            String itemDest = normalizeHubCode(item.getDestinationHub());
            if ("LOADED".equals(item.getStatus()) && currentStop.getHubCode().equalsIgnoreCase(itemDest)) {
                item.setStatus("UNLOADED");
                item.setUnloadedAt(LocalDateTime.now());
                tripManifestRepository.save(item);
                unloadedCount++;
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

        List<RoutingAssignment> pending = routingAssignmentRepository.findByStatus("ASSIGNED");
        List<EligibleAssignmentResponse> result = new ArrayList<>();

        for (RoutingAssignment a : pending) {
            String trackingCode = a.getTrackingCode();
            if (tripManifestRepository.existsByTripIdAndTrackingCode(tripId, trackingCode)) {
                continue;
            }

            Integer originOrder = stopOrderMap.get(normalizeHubCode(a.getSourceHub()));
            Integer destinationOrder = stopOrderMap.get(normalizeHubCode(a.getDestinationHub()));

            if (originOrder != null && destinationOrder != null && originOrder < destinationOrder) {
                result.add(EligibleAssignmentResponse.builder()
                        .trackingCode(trackingCode)
                        .sourceHub(a.getSourceHub())
                        .destinationHub(a.getDestinationHub())
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
}
