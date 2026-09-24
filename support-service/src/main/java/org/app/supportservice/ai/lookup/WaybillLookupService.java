package org.app.supportservice.ai.lookup;

import feign.FeignException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.app.supportservice.ai.client.ShipmentAiClient;
import org.app.supportservice.ai.dto.snapshot.ShipmentSnapshot;
import org.app.supportservice.ai.client.TrackingAiClient;
import org.app.supportservice.ai.dto.response.TrackingEventView;
import org.app.supportservice.ai.dto.response.TrackingStatusView;
import org.springframework.stereotype.Service;

import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;

@Slf4j
@Service
@RequiredArgsConstructor
public class WaybillLookupService {

    private static final DateTimeFormatter MILESTONE_TIME = DateTimeFormatter.ofPattern("HH:mm dd/MM/yyyy");

    private final TrackingAiClient trackingAiClient;
    private final ShipmentAiClient shipmentAiClient;

    public String describe(String trackingCode) {
        if (trackingCode == null || trackingCode.isBlank()) {
            return "Mã vận đơn không được để trống. Vui lòng cung cấp mã vận đơn hợp lệ.";
        }
        String code = trackingCode.trim().toUpperCase(Locale.ROOT);

        RemoteRead<TrackingStatusView> tracking = readTracking(code);
        RemoteRead<ShipmentSnapshot> shipment = readShipment(code);
        List<TrackingEventView> history = tracking.found() ? readHistory(code) : List.of();

        if (!tracking.found() && !shipment.found()) {
            if (tracking.unavailable() || shipment.unavailable()) {
                return "Hệ thống tra cứu vận đơn " + code + " đang bận. Chưa kết luận được trạng thái. Không suy đoán vị trí, giờ phát hay bưu tá.";
            }
            return "Không tìm thấy vận đơn " + code + " trên hệ thống. Không có vị trí, giờ phát hay bưu tá để thông báo.";
        }

        StringBuilder text = new StringBuilder();
        text.append("Vận đơn ").append(code).append(":\n");

        String status = firstNonBlank(
                tracking.found() ? tracking.value().getCurrentStatus() : null,
                shipment.found() ? shipment.value().getCurrentStatus() : null
        );
        text.append("- Trạng thái: ").append(statusLabel(status));
        if (status != null && !status.isBlank()) {
            text.append(" (").append(status.trim().toUpperCase(Locale.ROOT)).append(')');
        }
        text.append('\n');

        String location = firstNonBlank(
                tracking.found() ? tracking.value().getLocationCode() : null,
                latestLocation(history)
        );
        if (location != null) {
            text.append("- Vị trí quét gần nhất: ").append(location).append('\n');
        }

        TrackingEventView latest = latestEvent(history);
        if (latest != null && (hasText(latest.getNode()) || latest.getOccurredAt() != null)) {
            text.append("- Mốc gần nhất: ");
            if (latest.getOccurredAt() != null) {
                text.append(latest.getOccurredAt().format(MILESTONE_TIME));
            }
            if (hasText(latest.getNode())) {
                if (latest.getOccurredAt() != null) {
                    text.append(" — ");
                }
                text.append(latest.getNode().trim());
            }
            text.append('\n');
        }

        if (shipment.found()) {
            ShipmentSnapshot snap = shipment.value();
            if (hasText(snap.getReceiverName())) {
                text.append("- Người nhận: ").append(snap.getReceiverName().trim()).append('\n');
            }
            if (hasText(snap.getReceiverAddress())) {
                text.append("- Địa chỉ phát: ").append(snap.getReceiverAddress().trim()).append('\n');
            }
            if (snap.getCodAmount() != null) {
                text.append("- Tiền thu hộ: ").append(snap.getCodAmount().toPlainString()).append(" VND\n");
            }
            if (hasText(snap.getServiceType())) {
                text.append("- Dịch vụ: ").append(snap.getServiceType().trim()).append('\n');
            }
            if (snap.getWeight() != null) {
                text.append("- Khối lượng: ").append(snap.getWeight()).append(" kg\n");
            }
        }

        if (tracking.unavailable() || shipment.unavailable()) {
            text.append("- Một phần dữ liệu tra cứu đang bận, chỉ dùng các dòng đã có.\n");
        }
        text.append("Hệ thống không có tên hay số điện thoại bưu tá trong dữ liệu này. Không bịa thêm.");
        return text.toString();
    }

    static boolean shipmentMissing(int status, String body) {
        if (status == 404) {
            return true;
        }
        return status == 400 && body != null && body.toLowerCase(Locale.ROOT).contains("không tìm thấy");
    }

    static String statusLabel(String status) {
        if (status == null || status.isBlank()) {
            return "Chưa có trạng thái";
        }
        return switch (status.trim().toUpperCase(Locale.ROOT)) {
            case "CREATED", "RECEIVED" -> "Đã tiếp nhận";
            case "PENDING_ROUTING" -> "Chờ xếp tuyến";
            case "ROUTE_ASSIGNED" -> "Đã xếp tuyến";
            case "PICKED_UP" -> "Đã lấy hàng";
            case "IN_TRANSIT" -> "Đang vận chuyển";
            case "ARRIVED_DEST_HUB" -> "Đã đến kho đích";
            case "OUT_FOR_DELIVERY", "DELIVERING" -> "Đang phát hàng";
            case "DELIVERED" -> "Giao thành công";
            case "DELIVERY_FAILED" -> "Phát không thành";
            case "CANCELLED" -> "Đã hủy";
            case "RETURNING" -> "Đang hoàn";
            case "RETURNED" -> "Đã hoàn";
            default -> status.trim();
        };
    }

    private RemoteRead<TrackingStatusView> readTracking(String code) {
        try {
            TrackingStatusView status = trackingAiClient.getCurrentStatus(code);
            if (status == null || !hasText(status.getCurrentStatus())) {
                return RemoteRead.missing();
            }
            return RemoteRead.found(status);
        } catch (FeignException ex) {
            if (ex.status() == 404) {
                return RemoteRead.missing();
            }
            log.warn("[AI Tool] Tracking {} lỗi HTTP {}", code, ex.status());
            return RemoteRead.down();
        } catch (Exception ex) {
            log.warn("[AI Tool] Tracking {} không gọi được: {}", code, ex.getMessage());
            return RemoteRead.down();
        }
    }

    private List<TrackingEventView> readHistory(String code) {
        try {
            List<TrackingEventView> history = trackingAiClient.getHistory(code);
            return history == null ? List.of() : history;
        } catch (FeignException ex) {
            if (ex.status() != 404) {
                log.warn("[AI Tool] Hành trình {} lỗi HTTP {}", code, ex.status());
            }
            return List.of();
        } catch (Exception ex) {
            log.warn("[AI Tool] Hành trình {} không gọi được: {}", code, ex.getMessage());
            return List.of();
        }
    }

    private RemoteRead<ShipmentSnapshot> readShipment(String code) {
        try {
            ShipmentSnapshot snapshot = shipmentAiClient.getByCode(code);
            if (snapshot == null) {
                return RemoteRead.missing();
            }
            return RemoteRead.found(snapshot);
        } catch (FeignException ex) {
            String body = null;
            try {
                body = ex.contentUTF8();
            } catch (Exception ignored) {
                body = null;
            }
            if (shipmentMissing(ex.status(), body)) {
                return RemoteRead.missing();
            }
            log.warn("[AI Tool] Shipment {} lỗi HTTP {}", code, ex.status());
            return RemoteRead.down();
        } catch (Exception ex) {
            log.warn("[AI Tool] Shipment {} không gọi được: {}", code, ex.getMessage());
            return RemoteRead.down();
        }
    }

    private static TrackingEventView latestEvent(List<TrackingEventView> history) {
        if (history == null || history.isEmpty()) {
            return null;
        }
        return history.get(history.size() - 1);
    }

    private static String latestLocation(List<TrackingEventView> history) {
        TrackingEventView latest = latestEvent(history);
        if (latest == null || !hasText(latest.getLocationCode())) {
            return null;
        }
        return latest.getLocationCode().trim();
    }

    private static String firstNonBlank(String first, String second) {
        if (hasText(first)) {
            return first.trim();
        }
        if (hasText(second)) {
            return second.trim();
        }
        return null;
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private record RemoteRead<T>(T value, boolean unavailable) {
        static <T> RemoteRead<T> found(T value) {
            return new RemoteRead<>(value, false);
        }

        static <T> RemoteRead<T> missing() {
            return new RemoteRead<>(null, false);
        }

        static <T> RemoteRead<T> down() {
            return new RemoteRead<>(null, true);
        }

        boolean found() {
            return value != null;
        }
    }
}
