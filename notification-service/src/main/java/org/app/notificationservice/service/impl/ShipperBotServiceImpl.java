package org.app.notificationservice.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.app.notificationservice.client.ForecastClient;
import org.app.notificationservice.client.ShipmentClient;
import org.app.notificationservice.client.ShipperClient;
import org.app.notificationservice.client.TrackingClient;
import org.app.notificationservice.dto.response.ShipmentDetailResponse;
import org.app.notificationservice.dto.response.ShipperForecastResponse;
import org.app.notificationservice.dto.response.ShipperLookupResponse;
import org.app.notificationservice.service.ShipperBotService;
import org.app.notificationservice.service.ShipperOrderIndexService;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class ShipperBotServiceImpl implements ShipperBotService {

    private static final String ROLE_HEADER = "ROLE_SHIPPER";
    private static final Map<String, String> FAILURE_REASONS = Map.of(
            "KHONG_NGHE_MAY", "Khách không nghe máy",
            "SAI_DIA_CHI", "Sai địa chỉ",
            "HEN_LAI_NGAY", "Khách hẹn lại ngày",
            "TU_CHOI_NHAN", "Khách từ chối nhận");

    private final ShipperClient shipperClient;
    private final ShipmentClient shipmentClient;
    private final TrackingClient trackingClient;
    private final ForecastClient forecastClient;
    private final ShipperOrderIndexService shipperOrderIndexService;

    @Override
    public ShipperLookupResponse resolveShipper(String telegramChatId) {
        try {
            ShipperLookupResponse shipper = shipperClient.findByTelegramChatId(telegramChatId);
            if (shipper != null && shipper.isFound()) {
                return shipper;
            }
        } catch (Exception e) {
            log.warn("[SHIPPER-BOT] Không tra được bưu tá theo chatId {}: {}", telegramChatId, e.getMessage());
        }
        return ShipperLookupResponse.builder().found(false).build();
    }

    @Override
    public List<ShipmentDetailResponse> getActiveOrders(String courierCode) {
        List<ShipmentDetailResponse> active = new ArrayList<>();
        for (String trackingCode : shipperOrderIndexService.getOrders(courierCode)) {
            ShipmentDetailResponse shipment = fetchShipment(trackingCode);
            if (shipment == null || shipment.getCurrentStatus() == null) {
                continue;
            }
            String status = shipment.getCurrentStatus().trim().toUpperCase();
            if ("OUT_FOR_DELIVERY".equals(status) || "DELIVERY_FAILED".equals(status)) {
                active.add(shipment);
            } else if (!"ARRIVED_DEST_HUB".equals(status)) {
                // Đơn đã giao/hoàn/huỷ nhưng index còn sót -> dọn dẹp
                shipperOrderIndexService.removeOrder(courierCode, trackingCode);
            }
        }
        active.sort(Comparator.comparing(ShipmentDetailResponse::getTrackingCode,
                Comparator.nullsLast(Comparator.naturalOrder())));
        return active;
    }

    @Override
    public List<ShipmentDetailResponse> getPendingCodOrders(String courierCode) {
        List<ShipmentDetailResponse> pending = new ArrayList<>();
        for (String trackingCode : shipperOrderIndexService.getCodPending(courierCode)) {
            ShipmentDetailResponse shipment = fetchShipment(trackingCode);
            if (shipment == null) {
                continue;
            }
            BigDecimal cod = shipment.getCodAmount();
            String settlement = shipment.getCodSettlementStatus();
            boolean settledOrPending = settlement != null && !settlement.isBlank()
                    && !"UNSETTLED".equalsIgnoreCase(settlement);
            if (!"DELIVERED".equalsIgnoreCase(safe(shipment.getCurrentStatus()))
                    || cod == null || cod.compareTo(BigDecimal.ZERO) <= 0
                    || settledOrPending) {
                shipperOrderIndexService.removeCodPendingByTrackingCode(trackingCode);
                continue;
            }
            pending.add(shipment);
        }
        pending.sort(Comparator.comparing(ShipmentDetailResponse::getTrackingCode,
                Comparator.nullsLast(Comparator.naturalOrder())));
        return pending;
    }

    @Override
    public ShipmentDetailResponse getOrder(String trackingCode) {
        return fetchShipment(trackingCode);
    }

    @Override
    public boolean isOrderOwnedBy(String courierCode, String trackingCode) {
        return shipperOrderIndexService.isAssignedTo(courierCode, trackingCode);
    }

    @Override
    public ShipmentDetailResponse markDelivered(String courierCode, String trackingCode) {
        ShipperLookupResponse shipper = shipperClient.findByCourierCode(courierCode);
        ShipperLookupResponse resolved = (shipper != null && shipper.isFound()) ? shipper : null;
        String station = resolved != null && resolved.getStationCode() != null && !resolved.getStationCode().isBlank()
                ? resolved.getStationCode() : "DELIVERY_OFFICE";

        ShipmentDetailResponse shipment = fetchShipment(trackingCode);
        boolean hasCod = shipment != null && shipment.getCodAmount() != null
                && shipment.getCodAmount().compareTo(BigDecimal.ZERO) > 0;
        String note = hasCod
                ? "Bưu tá xác nhận giao thành công qua Telegram, đã thu COD " + shipment.getCodAmount().toPlainString() + "đ"
                : "Bưu tá xác nhận giao thành công qua Telegram";

        trackingClient.updateStatus(trackingCode, Map.of(
                "status", "DELIVERED",
                "locationCode", station,
                "note", note), ROLE_HEADER);

        shipperOrderIndexService.removeOrder(courierCode, trackingCode);
        if (hasCod) {
            shipperOrderIndexService.addCodPending(courierCode, trackingCode);
        }
        return fetchShipment(trackingCode);
    }

    @Override
    public ShipmentDetailResponse markDeliveryFailed(String courierCode, String trackingCode, String reasonCode) {
        String reason = FAILURE_REASONS.getOrDefault(reasonCode, "Giao thất bại");
        ShipperLookupResponse shipper = shipperClient.findByCourierCode(courierCode);
        String station = (shipper != null && shipper.isFound()
                && shipper.getStationCode() != null && !shipper.getStationCode().isBlank())
                ? shipper.getStationCode() : "DELIVERY_OFFICE";

        trackingClient.updateStatus(trackingCode, Map.of(
                "status", "DELIVERY_FAILED",
                "locationCode", station,
                "note", "Bưu tá báo qua Telegram: " + reason), ROLE_HEADER);

        // Đơn có thể đã tự chuyển RETURNING sau lần thất bại thứ 3
        return fetchShipment(trackingCode);
    }

    @Override
    public int submitCod(String courierCode, List<String> trackingCodes) {
        if (trackingCodes == null || trackingCodes.isEmpty()) {
            return 0;
        }
        shipmentClient.submitCodSettlement(Map.of(
                "trackingCodes", trackingCodes,
                "courierId", courierCode));
        for (String trackingCode : trackingCodes) {
            shipperOrderIndexService.removeCodPendingByTrackingCode(trackingCode);
        }
        return trackingCodes.size();
    }

    @Override
    public ShipperLookupResponse toggleShift(String courierCode) {
        try {
            return shipperClient.toggleShift(courierCode);
        } catch (Exception e) {
            log.error("[SHIPPER-BOT] Không đổi được ca trực cho {}: {}", courierCode, e.getMessage());
            return ShipperLookupResponse.builder().found(false).build();
        }
    }

    @Override
    public ShipperForecastResponse getForecast(String courierCode) {
        return safeForecast(courierCode);
    }

    private ShipperForecastResponse safeForecast(String courierCode) {
        try {
            return forecastClient.getShipperForecast(courierCode);
        } catch (Exception e) {
            log.warn("[SHIPPER-BOT] Không lấy được dự báo ca cho {}: {}", courierCode, e.getMessage());
            return null;
        }
    }

    private ShipmentDetailResponse fetchShipment(String trackingCode) {
        try {
            return shipmentClient.getShipmentByCode(trackingCode);
        } catch (Exception e) {
            log.warn("[SHIPPER-BOT] Không lấy được vận đơn {}: {}", trackingCode, e.getMessage());
            return null;
        }
    }

    private String safe(String value) {
        return value == null ? "" : value;
    }
}