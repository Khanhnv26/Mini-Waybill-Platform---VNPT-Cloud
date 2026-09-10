package org.app.routingservice.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.app.routingservice.dto.trip.ConsolidateItemRequest;
import org.app.routingservice.dto.trip.ConsolidateRequest;
import org.app.routingservice.dto.trip.CreateTripRequest;
import org.app.routingservice.dto.trip.TripDetailResponse;
import org.app.routingservice.entity.Hub;
import org.app.routingservice.entity.Trip;
import org.app.routingservice.entity.TripManifest;
import org.app.routingservice.entity.TripStop;
import org.app.routingservice.repository.HubRepository;
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

    @Override
    @Transactional
    public TripDetailResponse createTrip(CreateTripRequest request) {

        if (request.getStopHubCodes() == null || request.getStopHubCodes().size() < 2) {
            throw new IllegalArgumentException("Phải có ít nhất 2 điểm dừng để tạo chuyến đi.");
        }


        String tripCode = (request.getTripCode() != null && !request.getTripCode().isBlank())
                ? request.getTripCode().trim()
                : "TRP-" + LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd")) + "-"
                + UUID.randomUUID().toString().substring(0, 5).toUpperCase();

        String originHub = (request.getOriginHub() != null && !request.getOriginHub().isBlank())
                ? request.getOriginHub().trim()
                : request.getStopHubCodes().get(0);

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
                .stops(new ArrayList<>())
                .build();

        int order = 1;
        for (String hubCode : request.getStopHubCodes()) {
            Hub hub = hubRepository.findByHubCode(hubCode)
                    .orElseThrow(() -> new IllegalArgumentException("Hub code không tồn tại: " + hubCode));

            TripStop stop = TripStop.builder()
                    .trip(trip)
                    .stopOrder(order++)
                    .hubCode(hub.getHubCode())
                    .status("PENDING")
                    .build();

            trip.getStops().add(stop);
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

        List<TripStop> stops = tripStopRepository.findByTripIdOrderByStopOrder(tripId);

        if (stops == null || stops.size() < 2) {
            throw new IllegalStateException("Chuyến đi phải có ít nhất 2 điểm dừng để gom đơn.");
        }

        Map<String, Integer> stopOrderMap = stops.stream().collect(Collectors.toMap(TripStop::getHubCode, TripStop::getStopOrder));

        Double currentWeight = tripManifestRepository.sumActiveWeightByTripId(tripId);
        if (currentWeight == null) {
            currentWeight = 0.0;
        }

        Double maxWeight = trip.getMaxWeight() != null ? trip.getMaxWeight() : 5000.0;

        int addedCount = 0;

        if(request != null && request.getItems() != null) {
            for (ConsolidateItemRequest item : request.getItems()) {
                String trackingCode = item.getTrackingCode();
                String origin = item.getOriginHub();
                String destination = item.getDestinationHub();
                Double itemWeight = item.getWeight() != null ? item.getWeight() : 1.0;

                Integer originOrder = stopOrderMap.get(origin);
                Integer destinationOrder = stopOrderMap.get(destination);

                if(originOrder == null || destinationOrder == null) {
                    log.warn("Không tìm thấy thứ tự điểm dừng cho đơn hàng: {}", trackingCode);
                    continue;
                }

                if(originOrder >= destinationOrder) {
                    log.warn("Thứ tự điểm dừng không hợp lệ cho đơn hàng: {}", trackingCode);
                    continue;
                }

                if(currentWeight + itemWeight > maxWeight) {
                    log.warn("Không thể thêm đơn hàng {} vì vượt quá trọng lượng tối đa.", trackingCode);
                    continue;
                }

                if(tripManifestRepository.existsByTripIdAndTrackingCode(tripId, trackingCode)) {
                    log.warn("Đơn hàng {} đã tồn tại trong chuyến đi.", trackingCode);
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
                currentWeight += itemWeight;
                addedCount++;
                log.info("Thêm đơn hàng {} vào chuyến đi {} thành công.", trackingCode, trip.getTripCode());
            }
        }

        trip.setCurrentWeight(currentWeight);
        trip.setTotalShipments((int) tripManifestRepository.countByTripId(tripId));
        tripRepository.save(trip);
        log.info("Hoàn tất gom đơn cho xe {}: Đã thêm {} kiện mới. Tổng tải trọng hiện tại: {}/{} kg.",
                trip.getTripCode(), addedCount, currentWeight, maxWeight);

        return getTripDetail(trip.getId());
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

        TripStop currentStop = stops.stream()
                .filter(s -> hubCode.equals(s.getHubCode()))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy điểm dừng: " + hubCode + " trong chuyến xe: " + tripId));
        currentStop.setStatus("ARRIVED");
        currentStop.setArrivedAt(LocalDateTime.now());
        tripStopRepository.save(currentStop);
        trip.setCurrentHub(hubCode);

        // Gỡ các kiện hàng có điểm đến là hubCode
        List<TripManifest> manifests = tripManifestRepository.findByTripId(tripId);
        int unloadedCount = 0;

        for(TripManifest item : manifests) {
            if("LOADED".equals(item.getStatus()) && hubCode.equalsIgnoreCase(item.getDestinationHub())) {
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
        if(finalStop.getHubCode().equalsIgnoreCase(hubCode)) {
            trip.setStatus("COMPLETED");
            log.info("Chuyến xe {} đã hoàn tất tại điểm dừng cuối cùng: {}.", trip.getTripCode(), hubCode);
        } else {
            log.info("Chuyến xe {} đã đến điểm dừng: {}. Số kiện hàng đã gỡ: {}. Tải trọng hiện tại: {}/{} kg.",
                    trip.getTripCode(), hubCode, unloadedCount, trip.getCurrentWeight(), trip.getMaxWeight());
        }

        tripRepository.save(trip);
        return getTripDetail(trip.getId());
    }


}
