package org.app.routingservice.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.app.routingservice.client.ShipperClient;
import org.app.routingservice.dto.eta.EtaCalculationRequest;
import org.app.routingservice.dto.eta.EtaCalculationResponse;
import org.app.routingservice.dto.operation.StationCapacityDto;
import org.app.routingservice.entity.Hub;
import org.app.routingservice.entity.Trip;
import org.app.routingservice.repository.HubRepository;
import org.app.routingservice.repository.TripRepository;
import org.app.routingservice.repository.VehicleRepository;
import org.app.routingservice.service.DeliveryEtaService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
public class DeliveryEtaServiceImpl implements DeliveryEtaService {

    private final TripRepository tripRepository;
    private final VehicleRepository vehicleRepository;
    private final ShipperClient shipperClient;
    private final HubRepository hubRepository;

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

        DateTimeFormatter dateFormatter = DateTimeFormatter.ofPattern("dd 'Th'MM");
        String displayDateRange = estimatedDeliveryTime.format(dateFormatter) + " - "
                + estimatedDeliveryMax.format(dateFormatter);

        String displayCommitmentTime = "Trước " + estimatedDeliveryTime.format(DateTimeFormatter.ofPattern("HH:mm"));

        return EtaCalculationResponse.builder()
                .estimatedDeliveryTime(estimatedDeliveryTime)
                .estimatedDeliveryMax(estimatedDeliveryMax)
                .displayDateRange(displayDateRange)
                .displayCommitmentTime(displayCommitmentTime)
                .assignedTripCode(assignedTripCode)
                .vehiclePlate(vehiclePlate)
                .availableVehicleAtOriginHub((int) availableVehicles)
                .activeShippersAtDest(null)
                .availableCapacityAtDest(availableCapacity)
                .isFleetConstrained(isFleetConstrained)
                .build();
    }

    private double calculateDistanceKm(Hub h1, Hub h2) {
        if (h1 == null || h2 == null || h1.getLatitude() == null || h2.getLatitude() == null) {
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
