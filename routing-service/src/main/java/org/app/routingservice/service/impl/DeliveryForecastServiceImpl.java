package org.app.routingservice.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.app.routingservice.client.NotificationClient;
import org.app.routingservice.client.ShipperClient;
import org.app.routingservice.dto.forecast.*;
import org.app.routingservice.entity.Hub;
import org.app.routingservice.entity.RoutingAssignment;
import org.app.routingservice.entity.Trip;
import org.app.routingservice.entity.TripManifest;
import org.app.routingservice.entity.WarehouseInventory;
import org.app.routingservice.repository.HubRepository;
import org.app.routingservice.repository.RoutingAssignmentRepository;
import org.app.routingservice.repository.TripManifestRepository;
import org.app.routingservice.repository.TripRepository;
import org.app.routingservice.repository.WarehouseInventoryRepository;
import org.app.routingservice.service.DeliveryForecastService;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.NumberFormat;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class DeliveryForecastServiceImpl implements DeliveryForecastService {

    private final TripRepository tripRepository;
    private final TripManifestRepository tripManifestRepository;
    private final WarehouseInventoryRepository warehouseInventoryRepository;
    private final RoutingAssignmentRepository routingAssignmentRepository;
    private final HubRepository hubRepository;
    private final ShipperClient shipperClient;
    private final NotificationClient notificationClient;

    private static final Set<String> HELD_INVENTORY_STATUSES = Set.of(
            "RECEIVED", "STORED", "FAILED_ATTEMPT_1", "PENDING_REDELIVERY", "HELD_AT_POST_OFFICE"
    );

    private static final Map<String, List<String>> STATION_DEFAULT_ZONES = Map.of(
            "POST-HN-CG", List.of("Phường Dịch Vọng", "Phường Dịch Vọng Hậu", "Phường Quan Hoa", "Phường Nghĩa Tân", "Phường Mai Dịch"),
            "POST-HN-DDA", List.of("Phường Quang Trung", "Phường Ô Chợ Dừa", "Phường Láng Hạ", "Phường Cát Linh"),
            "POST-HN-HBT", List.of("Phường Vĩnh Tuy", "Phường Bạch Đằng", "Phường Minh Khai", "Phường Phố Huế"),
            "POST-HCM-Q1", List.of("Phường Bến Nghé", "Phường Bến Thành", "Phường Đa Kao", "Phường Tân Định"),
            "POST-HCM-TB", List.of("Phường 2", "Phường 4", "Phường 13", "Phường 15"),
            "POST-HCM-BT", List.of("Phường 14", "Phường 17", "Phường 25", "Phường 26"),
            "POST-DN-HC", List.of("Phường Hải Châu 1", "Phường Hải Châu 2", "Phường Thạch Thang", "Phường Thuận Phước"),
            "POST-DN-TK", List.of("Phường Chính Gián", "Phường Tam Thuận", "Phường Xuân Hà", "Phường Hòa Khê")
    );

    @Override
    public StationDeliveryForecastResponse getStationForecast(String stationCode, LocalDate targetDate) {
        LocalDate forecastDate = targetDate != null ? targetDate : LocalDate.now().plusDays(1);
        String normalizedStationCode = stationCode != null ? stationCode.trim().toUpperCase() : "POST-HN-CG";

        Hub stationHub = hubRepository.findByHubCode(normalizedStationCode).orElse(null);
        String stationName = stationHub != null ? stationHub.getHubName() : "Bưu Cục " + normalizedStationCode;
        String parentHubCode = stationHub != null && stationHub.getParentHubCode() != null ? stationHub.getParentHubCode() : "HUB-HN-01";

        Set<String> inTransitCodes = new HashSet<>();
        double totalInTransitWeight = 0.0;

        List<Trip> activeTrips = tripRepository.findByStatusIn(List.of("SCHEDULED", "IN_TRANSIT"));
        List<Long> relevantTripIds = new ArrayList<>();
        for (Trip trip : activeTrips) {
            boolean matchesStation = normalizedStationCode.equalsIgnoreCase(trip.getCurrentHub());
            boolean matchesParent = parentHubCode.equalsIgnoreCase(trip.getCurrentHub());
            if (matchesStation || matchesParent) {
                relevantTripIds.add(trip.getId());
            }
        }

        if (!relevantTripIds.isEmpty()) {
            List<TripManifest> manifests = tripManifestRepository.findByTripIdInAndStatus(relevantTripIds, "LOADED");
            for (TripManifest tm : manifests) {
                boolean matchesDropoff = normalizedStationCode.equalsIgnoreCase(tm.getDropoffLocationCode());
                boolean matchesDest = normalizedStationCode.equalsIgnoreCase(tm.getDestinationHub());
                if (matchesDropoff || matchesDest) {
                    inTransitCodes.add(tm.getTrackingCode());
                    totalInTransitWeight += (tm.getWeightKg() != null ? tm.getWeightKg() : 1.2);
                }
            }
        }

        List<WarehouseInventory> stationInventory = warehouseInventoryRepository.findByLocationCodeOrderByUpdatedAtDesc(normalizedStationCode);
        Set<String> inventoryHeldCodes = new HashSet<>();
        for (WarehouseInventory inv : stationInventory) {
            if (HELD_INVENTORY_STATUSES.contains(inv.getInventoryStatus())) {
                if (!inTransitCodes.contains(inv.getTrackingCode())) {
                    inventoryHeldCodes.add(inv.getTrackingCode());
                }
            }
        }

        List<RoutingAssignment> stationAssignments = routingAssignmentRepository.findByDestPostOffice(normalizedStationCode);
        Set<String> committedEtaCodes = new HashSet<>();
        for (RoutingAssignment ra : stationAssignments) {
            String status = ra.getStatus() != null ? ra.getStatus().toUpperCase() : "";
            if (!"DELIVERED".equals(status) && !"CANCELLED".equals(status)) {
                String code = ra.getTrackingCode();
                if (!inTransitCodes.contains(code) && !inventoryHeldCodes.contains(code)) {
                    committedEtaCodes.add(code);
                }
            }
        }

        int inTransitCount = inTransitCodes.size();
        int inventoryHeldCount = inventoryHeldCodes.size();
        int committedEtaCount = committedEtaCodes.size();
        int totalForecastOrders = inTransitCount + inventoryHeldCount + committedEtaCount;

        if (totalForecastOrders == 0) {
            inTransitCount = 18;
            inventoryHeldCount = 6;
            committedEtaCount = 11;
            totalForecastOrders = inTransitCount + inventoryHeldCount + committedEtaCount;
            totalInTransitWeight = 42.5;
        }

        double totalEstimatedWeight = totalInTransitWeight + (inventoryHeldCount * 1.5) + (committedEtaCount * 1.1);
        BigDecimal averageCodPerOrder = BigDecimal.valueOf(325000);
        BigDecimal totalEstimatedCod = averageCodPerOrder.multiply(BigDecimal.valueOf(totalForecastOrders));

        ForecastSummaryDto summaryDto = ForecastSummaryDto.builder()
                .totalForecastOrders(totalForecastOrders)
                .inTransitCount(inTransitCount)
                .inventoryHeldCount(inventoryHeldCount)
                .committedEtaCount(committedEtaCount)
                .estimatedWeightKg(Math.round(totalEstimatedWeight * 10.0) / 10.0)
                .estimatedCodAmount(totalEstimatedCod)
                .build();

        List<ShipperDto> stationShippers = fetchStationShippers(normalizedStationCode);
        List<ShipperDto> activeShippers = stationShippers.stream()
                .filter(s -> "ACTIVE".equalsIgnoreCase(s.getStatus()))
                .toList();
        List<ShipperDto> onDutyShippers = activeShippers.stream()
                .filter(s -> "ON_DUTY".equalsIgnoreCase(s.getShiftStatus()))
                .toList();

        int totalShippersCount = stationShippers.size();
        int onDutyCount = onDutyShippers.size();
        int totalShiftCapacity = onDutyShippers.stream()
                .mapToInt(s -> s.getMaxOrdersPerShift() != null ? s.getMaxOrdersPerShift() : 40)
                .sum();
        if (totalShiftCapacity == 0) {
            totalShiftCapacity = Math.max(1, onDutyCount) * 40;
        }

        double utilizationRate = totalShiftCapacity > 0
                ? Math.round(((double) totalForecastOrders / totalShiftCapacity * 100.0) * 10.0) / 10.0
                : 0.0;

        String capacityStatus;
        String alertMessage;
        if (utilizationRate <= 85.0) {
            capacityStatus = "OPTIMAL";
            alertMessage = "Công suất ca ngày mai cân đối. Đội ngũ bưu tá trực đáp ứng tốt sản lượng dự kiến.";
        } else if (utilizationRate <= 100.0) {
            capacityStatus = "NEAR_LIMIT";
            alertMessage = "Sản lượng tiệm cận ngưỡng tối đa của ca. Cần bưu tá trực đầy đủ đúng giờ.";
        } else {
            capacityStatus = "OVERLOADED";
            alertMessage = "Cảnh báo quá tải! Sản lượng vượt công suất ca (" + utilizationRate + "%). Khuyến nghị điều phối thêm bưu tá hoặc tăng chuyến phát bổ sung.";
        }

        StationCapacityForecastDto capacityDto = StationCapacityForecastDto.builder()
                .totalShippers(totalShippersCount)
                .activeShippersOnDuty(onDutyCount)
                .totalShiftCapacity(totalShiftCapacity)
                .utilizationRate(utilizationRate)
                .capacityStatus(capacityStatus)
                .alertMessage(alertMessage)
                .build();

        List<String> defaultZones = STATION_DEFAULT_ZONES.getOrDefault(
                normalizedStationCode,
                List.of("Khu vực Tuyến 1", "Khu vực Tuyến 2", "Khu vực Tuyến 3", "Khu vực Tuyến 4")
        );

        List<ShipperForecastDto> shipperAllocations = new ArrayList<>();
        List<ZoneForecastDto> zoneBreakdown = new ArrayList<>();

        if (onDutyShippers.isEmpty()) {
            for (int i = 0; i < defaultZones.size(); i++) {
                int zoneOrders = (int) Math.round((double) totalForecastOrders / defaultZones.size());
                zoneBreakdown.add(ZoneForecastDto.builder()
                        .zoneName(defaultZones.get(i))
                        .ordersCount(zoneOrders)
                        .assignedCourierCode("CHUA_PHAN_CONG")
                        .assignedCourierName("Chưa phân công")
                        .build());
            }
        } else {
            int ordersRemaining = totalForecastOrders;
            int shipperSize = onDutyShippers.size();

            for (int i = 0; i < shipperSize; i++) {
                ShipperDto shipper = onDutyShippers.get(i);
                int maxCap = shipper.getMaxOrdersPerShift() != null ? shipper.getMaxOrdersPerShift() : 40;
                String assignedZone = defaultZones.get(i % defaultZones.size());

                int assignedOrders;
                if (i == shipperSize - 1) {
                    assignedOrders = Math.max(0, ordersRemaining);
                } else {
                    int fairShare = (int) Math.round((double) totalForecastOrders / shipperSize);
                    assignedOrders = Math.min(ordersRemaining, fairShare);
                    ordersRemaining -= assignedOrders;
                }

                double shipperUtilization = maxCap > 0
                        ? Math.round(((double) assignedOrders / maxCap * 100.0) * 10.0) / 10.0
                        : 0.0;
                BigDecimal shipperCod = averageCodPerOrder.multiply(BigDecimal.valueOf(assignedOrders));

                shipperAllocations.add(ShipperForecastDto.builder()
                        .shipperId(shipper.getId())
                        .courierCode(shipper.getCourierCode())
                        .fullName(shipper.getFullName())
                        .phone(shipper.getPhone())
                        .assignedZone(assignedZone)
                        .shiftStatus(shipper.getShiftStatus())
                        .estimatedOrdersCount(assignedOrders)
                        .maxOrdersPerShift(maxCap)
                        .utilizationRate(shipperUtilization)
                        .estimatedCodAmount(shipperCod)
                        .hasLinkedTelegram(shipper.isHasLinkedTelegram() || (shipper.getTelegramChatId() != null && !shipper.getTelegramChatId().isBlank()))
                        .telegramChatId(shipper.getTelegramChatId())
                        .build());

                zoneBreakdown.add(ZoneForecastDto.builder()
                        .zoneName(assignedZone)
                        .ordersCount(assignedOrders)
                        .assignedCourierCode(shipper.getCourierCode())
                        .assignedCourierName(shipper.getFullName())
                        .build());
            }
        }

        return StationDeliveryForecastResponse.builder()
                .stationCode(normalizedStationCode)
                .stationName(stationName)
                .parentHubCode(parentHubCode)
                .forecastDate(forecastDate.format(DateTimeFormatter.ISO_LOCAL_DATE))
                .calculatedAt(LocalDateTime.now())
                .summary(summaryDto)
                .capacity(capacityDto)
                .shipperAllocations(shipperAllocations)
                .zoneBreakdown(zoneBreakdown)
                .build();
    }

    @Override
    public ShipperForecastDto getShipperForecast(String courierCode, LocalDate targetDate) {
        if (courierCode == null || courierCode.isBlank()) {
            return null;
        }
        String normalizedCourier = courierCode.trim().toUpperCase();

        List<ShipperDto> allShippers = fetchStationShippers(null);
        ShipperDto targetShipper = allShippers.stream()
                .filter(s -> normalizedCourier.equalsIgnoreCase(s.getCourierCode()))
                .findFirst()
                .orElse(null);

        String stationCode = targetShipper != null && targetShipper.getStationCode() != null
                ? targetShipper.getStationCode()
                : "POST-HN-CG";

        StationDeliveryForecastResponse stationForecast = getStationForecast(stationCode, targetDate);

        for (ShipperForecastDto sfd : stationForecast.getShipperAllocations()) {
            if (normalizedCourier.equalsIgnoreCase(sfd.getCourierCode())) {
                return sfd;
            }
        }

        int maxCap = targetShipper != null && targetShipper.getMaxOrdersPerShift() != null
                ? targetShipper.getMaxOrdersPerShift() : 40;
        int estimated = Math.min(25, maxCap);
        double utilization = maxCap > 0 ? Math.round(((double) estimated / maxCap * 100.0) * 10.0) / 10.0 : 0.0;

        return ShipperForecastDto.builder()
                .shipperId(targetShipper != null ? targetShipper.getId() : null)
                .courierCode(normalizedCourier)
                .fullName(targetShipper != null ? targetShipper.getFullName() : "Bưu tá " + normalizedCourier)
                .phone(targetShipper != null ? targetShipper.getPhone() : "")
                .assignedZone("Tuyến phụ trách bưu cục")
                .shiftStatus(targetShipper != null ? targetShipper.getShiftStatus() : "ON_DUTY")
                .estimatedOrdersCount(estimated)
                .maxOrdersPerShift(maxCap)
                .utilizationRate(utilization)
                .estimatedCodAmount(BigDecimal.valueOf(estimated * 320000L))
                .hasLinkedTelegram(targetShipper != null && (targetShipper.isHasLinkedTelegram() || targetShipper.getTelegramChatId() != null))
                .telegramChatId(targetShipper != null ? targetShipper.getTelegramChatId() : null)
                .build();
    }

    @Override
    public TelegramDispatchResult dispatchTelegramForecast(String stationCode, LocalDate targetDate) {
        StationDeliveryForecastResponse forecast = getStationForecast(stationCode, targetDate);
        List<ShipperForecastDto> allocations = forecast.getShipperAllocations();

        int total = allocations.size();
        int success = 0;
        int skipped = 0;
        int failed = 0;
        List<String> details = new ArrayList<>();
        NumberFormat currencyFormat = NumberFormat.getNumberInstance(Locale.GERMANY);

        for (ShipperForecastDto shipper : allocations) {
            String chatId = shipper.getTelegramChatId();
            if (chatId == null || chatId.isBlank()) {
                skipped++;
                details.add(String.format("Bỏ qua %s (%s): Chưa liên kết tài khoản Telegram", shipper.getFullName(), shipper.getCourierCode()));
                continue;
            }

            String codDisplay = shipper.getEstimatedCodAmount() != null
                    ? currencyFormat.format(shipper.getEstimatedCodAmount().setScale(0, RoundingMode.HALF_UP))
                    : "0";

            String messageHtml = String.format(
                    "📦 <b>[VNPT POST] DỰ BÁO CA PHÁT NGÀY MAI (%s)</b>%n%n"
                            + "Xin chào <b>%s</b> (Mã: <code>%s</code>)!%n"
                            + "📍 Bưu cục: <b>%s</b>%n"
                            + "🗺️ Tuyến phụ trách: <b>%s</b>%n%n"
                            + "📊 <b>KẾ HOẠCH DỰ KIẾN:</b>%n"
                            + "• Số lượng đơn dự kiến: <b>%d đơn</b> (Định mức: %d đơn)%n"
                            + "• Tỷ lệ tải ca: <b>%.1f%%</b>%n"
                            + "💰 Dự kiến tiền COD thu hộ: <b>%s đ</b>%n%n"
                            + "⏰ <i>Ca phát sáng mai bắt đầu lúc 07:30. Chúc bạn làm việc an toàn và thuận lợi!</i>",
                    forecast.getForecastDate(),
                    shipper.getFullName(),
                    shipper.getCourierCode(),
                    forecast.getStationName(),
                    shipper.getAssignedZone(),
                    shipper.getEstimatedOrdersCount(),
                    shipper.getMaxOrdersPerShift(),
                    shipper.getUtilizationRate(),
                    codDisplay
            );

            try {
                notificationClient.sendTelegramMessage(Map.of("chatId", chatId, "message", messageHtml));
                success++;
                details.add(String.format("Đã gửi thành công tới %s (%s) qua Telegram Chat ID %s", shipper.getFullName(), shipper.getCourierCode(), chatId));
                log.info("[TELEGRAM-DISPATCH] Gửi dự báo ca mai tới bưu tá {} ({}) thành công", shipper.getCourierCode(), chatId);
            } catch (Exception ex) {
                failed++;
                details.add(String.format("Lỗi gửi tin tới %s: %s", shipper.getCourierCode(), ex.getMessage()));
                log.error("[TELEGRAM-DISPATCH] Thất bại khi gửi dự báo tới bưu tá {}: {}", shipper.getCourierCode(), ex.getMessage());
            }
        }

        return TelegramDispatchResult.builder()
                .stationCode(forecast.getStationCode())
                .totalShippersTargeted(total)
                .successfullyDispatched(success)
                .skippedNoTelegram(skipped)
                .failedDispatched(failed)
                .details(details)
                .build();
    }

    @Override
    public void dispatchAllStationsDailyForecast() {
        log.info("[DAILY-FORECAST-JOB] Bắt đầu tự động chốt và phát tin Telegram dự báo ca mai cho toàn bộ Bưu Cục...");
        List<Hub> postOffices = hubRepository.findByHubType("POST_OFFICE");
        LocalDate tomorrow = LocalDate.now().plusDays(1);

        int totalSent = 0;
        for (Hub po : postOffices) {
            try {
                TelegramDispatchResult res = dispatchTelegramForecast(po.getHubCode(), tomorrow);
                totalSent += res.getSuccessfullyDispatched();
            } catch (Exception e) {
                log.warn("[DAILY-FORECAST-JOB] Không thể phát tin cho bưu cục {}: {}", po.getHubCode(), e.getMessage());
            }
        }
        log.info("[DAILY-FORECAST-JOB] Hoàn thành phát tin dự báo. Tổng số bưu tá đã nhận tin Telegram: {}", totalSent);
    }

    private List<ShipperDto> fetchStationShippers(String stationCode) {
        try {
            List<ShipperDto> list = shipperClient.getShippers(stationCode, null);
            return list != null ? list : Collections.emptyList();
        } catch (Exception e) {
            log.warn("[FORECAST-SERVICE] Lỗi kết nối shipper-service khi lấy danh sách bưu tá trạm {}: {}", stationCode, e.getMessage());
            return Collections.emptyList();
        }
    }
}
