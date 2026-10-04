package org.app.notificationservice.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.app.notificationservice.client.ForecastClient;
import org.app.notificationservice.client.PaymentClient;
import org.app.notificationservice.client.ShipmentClient;
import org.app.notificationservice.client.ShipperClient;
import org.app.notificationservice.client.TrackingClient;
import org.app.notificationservice.dto.response.PaymentResponse;
import org.app.notificationservice.dto.response.ShipmentDetailResponse;
import org.app.notificationservice.dto.response.ShipperForecastResponse;
import org.app.notificationservice.dto.response.ShipperLookupResponse;
import org.app.notificationservice.service.ShipperBotService;
import org.app.notificationservice.service.ShipperOrderIndexService;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class ShipperBotServiceImpl implements ShipperBotService {

    private static final String ROLE_HEADER = "ROLE_SHIPPER";
    private static final BigDecimal DEFAULT_RETURN_BASE_FEE = BigDecimal.valueOf(35000);
    private static final BigDecimal RETURN_FEE_RATE = BigDecimal.valueOf(0.5);

    private static final Map<String, String> FAILURE_REASONS = Map.of(
            "KHONG_NGHE_MAY", "Khách không nghe máy",
            "SAI_DIA_CHI", "Sai địa chỉ",
            "HEN_LAI_NGAY", "Khách hẹn lại ngày",
            "TU_CHOI_NHAN", "Khách từ chối nhận");

    private final ShipperClient shipperClient;
    private final ShipmentClient shipmentClient;
    private final TrackingClient trackingClient;
    private final ForecastClient forecastClient;
    private final PaymentClient paymentClient;
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
        return getOrders(courierCode, "ALL");
    }

    @Override
    public List<ShipmentDetailResponse> getOrders(String courierCode, String filter) {
        List<ShipmentDetailResponse> result = new ArrayList<>();
        for (String trackingCode : shipperOrderIndexService.getOrders(courierCode)) {
            ShipmentDetailResponse shipment = fetchShipment(trackingCode);
            if (shipment == null || shipment.getCurrentStatus() == null) {
                continue;
            }
            String status = shipment.getCurrentStatus().trim().toUpperCase();
            if (isActiveStatus(status)) {
                if (matchesFilter(status, filter)) {
                    result.add(shipment);
                }
            } else if (!"ARRIVED_DEST_HUB".equals(status)) {
                shipperOrderIndexService.removeOrder(courierCode, trackingCode);
            }
        }
        result.sort(Comparator.comparing(ShipmentDetailResponse::getTrackingCode,
                Comparator.nullsLast(Comparator.naturalOrder())));
        return result;
    }

    @Override
    public List<ShipmentDetailResponse> getDeliveredToday(String courierCode) {
        List<ShipmentDetailResponse> result = new ArrayList<>();
        for (String trackingCode : shipperOrderIndexService.getDeliveredToday(courierCode)) {
            ShipmentDetailResponse shipment = fetchShipment(trackingCode);
            if (shipment != null && "DELIVERED".equalsIgnoreCase(safe(shipment.getCurrentStatus()))) {
                result.add(shipment);
            }
        }
        result.sort(Comparator.comparing(ShipmentDetailResponse::getTrackingCode,
                Comparator.nullsLast(Comparator.naturalOrder())));
        return result;
    }

    @Override
    public Map<String, List<ShipmentDetailResponse>> getCodGroups(String courierCode) {
        Map<String, List<ShipmentDetailResponse>> groups = new LinkedHashMap<>();

        List<ShipmentDetailResponse> pending = new ArrayList<>();
        for (String trackingCode : shipperOrderIndexService.getCodPending(courierCode)) {
            ShipmentDetailResponse shipment = fetchShipment(trackingCode);
            if (shipment == null) {
                continue;
            }
            BigDecimal cod = shipment.getCodAmount();
            String settlement = shipment.getCodSettlementStatus();
            boolean stillPending = "DELIVERED".equalsIgnoreCase(safe(shipment.getCurrentStatus()))
                    && cod != null && cod.compareTo(BigDecimal.ZERO) > 0
                    && (settlement == null || settlement.isBlank() || "UNSETTLED".equalsIgnoreCase(settlement));
            if (stillPending) {
                pending.add(shipment);
            } else {
                shipperOrderIndexService.removeCodPendingByTrackingCode(trackingCode);
            }
        }

        List<ShipmentDetailResponse> sent = new ArrayList<>();
        for (String trackingCode : shipperOrderIndexService.getCodSent(courierCode)) {
            ShipmentDetailResponse shipment = fetchShipment(trackingCode);
            if (shipment != null && codAmountOf(shipment).compareTo(BigDecimal.ZERO) > 0) {
                sent.add(shipment);
            }
        }

        List<ShipmentDetailResponse> settled = new ArrayList<>();
        for (String trackingCode : shipperOrderIndexService.getCodSettled(courierCode)) {
            ShipmentDetailResponse shipment = fetchShipment(trackingCode);
            if (shipment != null && codAmountOf(shipment).compareTo(BigDecimal.ZERO) > 0) {
                settled.add(shipment);
            }
        }

        sortByTrackingCode(pending);
        sortByTrackingCode(sent);
        sortByTrackingCode(settled);
        groups.put("pending", pending);
        groups.put("sent", sent);
        groups.put("settled", settled);
        return groups;
    }

    @Override
    public List<ShipmentDetailResponse> getPendingCodOrders(String courierCode) {
        return getCodGroups(courierCode).getOrDefault("pending", List.of());
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
        String station = stationOf(courierCode);
        ShipmentDetailResponse shipment = fetchShipment(trackingCode);
        boolean hasCod = codAmountOf(shipment).compareTo(BigDecimal.ZERO) > 0;
        String note = hasCod
                ? "Bưu tá xác nhận giao thành công qua Telegram, đã thu tiền mặt COD " + formatMoney(shipment.getCodAmount())
                : "Bưu tá xác nhận giao thành công qua Telegram";

        trackingClient.updateStatus(trackingCode, Map.of(
                "status", "DELIVERED",
                "locationCode", station,
                "note", note), ROLE_HEADER);

        shipperOrderIndexService.removeOrder(courierCode, trackingCode);
        shipperOrderIndexService.markDeliveredToday(courierCode, trackingCode);
        if (hasCod) {
            shipperOrderIndexService.addCodPending(courierCode, trackingCode);
        }
        return fetchShipment(trackingCode);
    }

    @Override
    public ShipmentDetailResponse markDeliveryFailed(String courierCode, String trackingCode, String reasonCode) {
        String reason = FAILURE_REASONS.getOrDefault(reasonCode, "Giao thất bại");
        trackingClient.updateStatus(trackingCode, Map.of(
                "status", "DELIVERY_FAILED",
                "locationCode", stationOf(courierCode),
                "note", "Bưu tá báo qua Telegram: " + reason), ROLE_HEADER);
        return fetchShipment(trackingCode);
    }

    @Override
    public ShipmentDetailResponse retryDelivery(String courierCode, String trackingCode) {
        trackingClient.updateStatus(trackingCode, Map.of(
                "status", "OUT_FOR_DELIVERY",
                "locationCode", stationOf(courierCode),
                "note", "Bưu tá tiếp nhận lại bưu gửi để phát chặng cuối (qua Telegram)"), ROLE_HEADER);
        return fetchShipment(trackingCode);
    }

    @Override
    public ShipmentDetailResponse acceptReturn(String courierCode, String trackingCode) {
        ShipmentDetailResponse shipment = fetchShipment(trackingCode);
        String senderName = shipment != null ? safe(shipment.getSenderName()) : "người gửi";
        trackingClient.updateStatus(trackingCode, Map.of(
                "status", "OUT_FOR_RETURN",
                "locationCode", stationOf(courierCode),
                "note", "Bưu tá tiếp nhận bưu phẩm hoàn, xuất phát phát hoàn về địa chỉ người gửi ("
                        + senderName + ") qua Telegram"), ROLE_HEADER);
        return fetchShipment(trackingCode);
    }

    @Override
    public ShipmentDetailResponse confirmReturned(String courierCode, String trackingCode, boolean viaQr) {
        ShipmentDetailResponse shipment = fetchShipment(trackingCode);
        String senderName = shipment != null ? safe(shipment.getSenderName()) : "người gửi";
        String senderAddress = shipment != null ? safe(shipment.getSenderAddress()) : "";
        BigDecimal returnFee = calculateReturnFee(shipment);
        String paymentText = viaQr
                ? "đã thu cước hoàn " + formatMoney(returnFee) + " (50%) qua VietQR"
                : "đã thu tiền mặt cước hoàn " + formatMoney(returnFee) + " (50%)";
        trackingClient.updateStatus(trackingCode, Map.of(
                "status", "RETURNED",
                "locationCode", stationOf(courierCode),
                "note", "Bưu tá đã phát hoàn thành công về tay người gửi (" + senderName + ") tại "
                        + senderAddress + " - " + paymentText + " (qua Telegram)"), ROLE_HEADER);
        return fetchShipment(trackingCode);
    }

    @Override
    public PaymentResponse createCodQr(String courierCode, String trackingCode) {
        ShipmentDetailResponse shipment = fetchShipment(trackingCode);
        if (shipment == null) {
            throw new IllegalStateException("Không tìm thấy đơn " + trackingCode);
        }
        BigDecimal cod = shipment.getCodAmount();
        if (cod == null || cod.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalStateException("Đơn này không có tiền COD để thu.");
        }
        return paymentClient.createQr(Map.of(
                "trackingCode", trackingCode,
                "amount", cod,
                "paymentType", "COD",
                "note", "Thu COD don " + trackingCode));
    }

    @Override
    public PaymentResponse createReturnQr(String courierCode, String trackingCode) {
        ShipmentDetailResponse shipment = fetchShipment(trackingCode);
        if (shipment == null) {
            throw new IllegalStateException("Không tìm thấy đơn " + trackingCode);
        }
        BigDecimal returnFee = calculateReturnFee(shipment);
        return paymentClient.createQr(Map.of(
                "trackingCode", trackingCode,
                "amount", returnFee,
                "paymentType", "SHIPPING_FEE",
                "note", "Cuoc hoan don " + trackingCode));
    }

    @Override
    public PaymentResponse getPayment(String trackingCode) {
        try {
            return paymentClient.getByTracking(trackingCode);
        } catch (Exception e) {
            log.warn("[SHIPPER-BOT] Không lấy được giao dịch của đơn {}: {}", trackingCode, e.getMessage());
            return null;
        }
    }

    @Override
    public void mockPay(String trackingCode) {
        paymentClient.mockPay(trackingCode);
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
            shipperOrderIndexService.applySettlementStatus(trackingCode, "PENDING_SETTLEMENT");
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

    // ------------------------------------------------------------------ helpers

    public BigDecimal calculateReturnFee(ShipmentDetailResponse shipment) {
        if (shipment == null) {
            return DEFAULT_RETURN_BASE_FEE.multiply(RETURN_FEE_RATE).setScale(0, RoundingMode.HALF_UP);
        }
        BigDecimal base = shipment.getShippingFee();
        if (base == null || base.compareTo(BigDecimal.ZERO) <= 0) {
            base = shipment.getTotalFee();
        }
        if (base == null || base.compareTo(BigDecimal.ZERO) <= 0) {
            base = DEFAULT_RETURN_BASE_FEE;
        }
        return base.multiply(RETURN_FEE_RATE).setScale(0, RoundingMode.HALF_UP);
    }

    private boolean isActiveStatus(String status) {
        return Set.of("OUT_FOR_DELIVERY", "DELIVERY_FAILED", "RETURNING", "OUT_FOR_RETURN").contains(status);
    }

    private boolean matchesFilter(String status, String filter) {
        if (filter == null || filter.isBlank()) {
            return true;
        }
        return switch (filter.trim().toUpperCase()) {
            case "OUT" -> "OUT_FOR_DELIVERY".equals(status);
            case "FAILED" -> "DELIVERY_FAILED".equals(status);
            case "RETURN" -> "RETURNING".equals(status) || "OUT_FOR_RETURN".equals(status);
            default -> true;
        };
    }

    private BigDecimal codAmountOf(ShipmentDetailResponse shipment) {
        if (shipment == null || shipment.getCodAmount() == null) {
            return BigDecimal.ZERO;
        }
        return shipment.getCodAmount();
    }

    private void sortByTrackingCode(List<ShipmentDetailResponse> list) {
        list.sort(Comparator.comparing(ShipmentDetailResponse::getTrackingCode,
                Comparator.nullsLast(Comparator.naturalOrder())));
    }

    private String stationOf(String courierCode) {
        try {
            ShipperLookupResponse shipper = shipperClient.findByCourierCode(courierCode);
            if (shipper != null && shipper.isFound()
                    && shipper.getStationCode() != null && !shipper.getStationCode().isBlank()) {
                return shipper.getStationCode();
            }
        } catch (Exception e) {
            log.warn("[SHIPPER-BOT] Không lấy được bưu cục của {}: {}", courierCode, e.getMessage());
        }
        return "DELIVERY_OFFICE";
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

    private String formatMoney(BigDecimal amount) {
        if (amount == null) {
            return "0đ";
        }
        return String.format("%,.0fđ", amount.doubleValue());
    }

    private String safe(String value) {
        return value == null ? "" : value;
    }
}