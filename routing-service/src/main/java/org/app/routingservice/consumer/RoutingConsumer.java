package org.app.routingservice.consumer;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.app.routingservice.dto.event.CreateShipmentEvent;
import org.app.routingservice.dto.event.RouteAssignedEvent;
import org.app.routingservice.dto.event.ShipmentStatusUpdatedEvent;
import org.app.routingservice.entity.Hub;
import org.app.routingservice.entity.RoutingAssignment;
import org.app.routingservice.repository.HubRepository;
import org.app.routingservice.repository.RoutingAssignmentRepository;
import org.springframework.kafka.annotation.BackOff;
import org.springframework.kafka.annotation.DltHandler;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.annotation.RetryableTopic;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.KafkaHeaders;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.time.LocalDateTime;
import java.util.List;
import java.util.regex.Pattern;

@Slf4j
@Service
@RequiredArgsConstructor
public class RoutingConsumer {

    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final RoutingAssignmentRepository routingAssignmentRepository;
    private final HubRepository hubRepository;

    private record HubRoutingResult(String centralHubCode, String postOfficeCode) {}

    @KafkaListener(topics = "shipment-events", groupId = "routing-group")
    @RetryableTopic(attempts = "3", backOff = @BackOff(delay = 1000, multiplier = 2))
    public void handleShipmentCreatedEvent(CreateShipmentEvent event) {
        log.info("[ROUTING-SERVICE] Nhận được event tạo đơn mới: trackingCode = {}", event.getTrackingCode());

        HubRoutingResult sourceRoute = determineRouteHierarchy(event.getSenderAddress(), "HUB-HN-01", "POST-HN-CG");
        HubRoutingResult destRoute = determineRouteHierarchy(event.getReceiverAddress(), "HUB-HCM-01", "POST-HCM-Q1");

        String sourceHub = sourceRoute.centralHubCode();
        String originPostOffice = sourceRoute.postOfficeCode();
        String destinationHub = destRoute.centralHubCode();
        String destPostOffice = destRoute.postOfficeCode();
        String routeCode = "ROUTE-" + sourceHub + "-TO-" + destinationHub;

        boolean hasSeparateOriginPo = originPostOffice != null && !originPostOffice.equalsIgnoreCase(sourceHub);
        String initialStatus = hasSeparateOriginPo ? "ASSIGNED_ORIGIN_PO" : "AT_SOURCE_HUB";

        RoutingAssignment assignment = RoutingAssignment.builder()
                .trackingCode(event.getTrackingCode())
                .sourceHub(sourceHub)
                .destinationHub(destinationHub)
                .originPostOffice(originPostOffice)
                .destPostOffice(destPostOffice)
                .routeCode(routeCode)
                .weight(event.getWeight() != null ? event.getWeight() : 1.0)
                .serviceType(event.getServiceType() != null ? event.getServiceType() : "EXPRESS")
                .status(initialStatus)
                .assignedAt(LocalDateTime.now())
                .build();
        routingAssignmentRepository.save(assignment);
        log.info("[ROUTING-SERVICE] Phân tuyến 3 cấp thành công cho đơn {}: {} (Từ {} qua {} đến {} rồi về {})",
                event.getTrackingCode(), routeCode, originPostOffice, sourceHub, destinationHub, destPostOffice);

        RouteAssignedEvent routeEvent = RouteAssignedEvent.builder()
                .trackingCode(event.getTrackingCode())
                .sourceHub(sourceHub)
                .destinationHub(destinationHub)
                .originPostOffice(originPostOffice)
                .destPostOffice(destPostOffice)
                .routeCode(routeCode)
                .status(initialStatus)
                .assignedAt(LocalDateTime.now())
                .build();

        kafkaTemplate.send("route-assigned", event.getTrackingCode(), routeEvent);
        log.info("[ROUTING-SERVICE] Đã bắn event RouteAssignedEvent lên topic 'route-assigned'");

        String initialNote = hasSeparateOriginPo
                ? String.format("Đã phân tuyến: Bưu cục gốc [%s] tiếp nhận ➔ Chờ xe gom lên Kho Tổng [%s].", originPostOffice, sourceHub)
                : "Đã phân tuyến vận chuyển: " + routeCode;

        ShipmentStatusUpdatedEvent statusEvent = ShipmentStatusUpdatedEvent.builder()
                .trackingCode(event.getTrackingCode())
                .status("ROUTE_ASSIGNED")
                .locationCode(originPostOffice != null ? originPostOffice : sourceHub)
                .note(initialNote)
                .updateAt(LocalDateTime.now().toString())
                .build();
        kafkaTemplate.send("tracking-status-events", event.getTrackingCode(), statusEvent);
        log.info("[ROUTING-SERVICE] Đã bắn event ShipmentStatusUpdatedEvent (ROUTE_ASSIGNED) lên topic 'tracking-status-events'");

    }

    @DltHandler
    public void handleDlt(CreateShipmentEvent event,
                          @Header(KafkaHeaders.RECEIVED_TOPIC) String topic,
                          @Header(KafkaHeaders.OFFSET) long offset){
        log.error("[ROUTING-SERVICE] Event CreateShipmentEvent với trackingCode {} đã thất bại sau 3 lần thử. Gửi vào DLT để xử lý thủ công.", event.getTrackingCode());
    }

    private String unaccent(String text) {
        if (text == null) return "";
        String normalized = Normalizer.normalize(text, Normalizer.Form.NFD);
        Pattern pattern = Pattern.compile("\\p{InCombiningDiacriticalMarks}+");
        return pattern.matcher(normalized).replaceAll("")
                .replace('đ', 'd')
                .replace('Đ', 'd')
                .toLowerCase()
                .trim();
    }

    private HubRoutingResult determineRouteHierarchy(String address, String defaultCentralHub, String defaultPostOffice) {
        if (address == null || address.isBlank()) {
            return new HubRoutingResult(defaultCentralHub, defaultPostOffice);
        }

        List<Hub> allHubs = hubRepository.findAll();
        String addressLower = address.toLowerCase();
        String addressUnaccent = unaccent(address);

        // 1. Tìm Kho Tổng Cấp 1 (Central Hub) theo Tỉnh/Thành phố
        Hub centralHub = null;
        for (Hub h : allHubs) {
            if ((h.getHubLevel() == null || h.getHubLevel() == 1) && h.getProvince() != null) {
                String provLower = h.getProvince().toLowerCase();
                String provUnaccent = unaccent(h.getProvince());

                boolean match = addressLower.contains(provLower) || addressUnaccent.contains(provUnaccent);

                if (!match) {
                    if (provUnaccent.contains("ho chi minh") &&
                        (addressUnaccent.contains("hcm") || addressUnaccent.contains("sai gon") || addressUnaccent.contains("tphcm"))) {
                        match = true;
                    } else if (provUnaccent.contains("ha noi") &&
                        (addressUnaccent.contains("hn") || addressUnaccent.contains("tp ha noi"))) {
                        match = true;
                    } else if (provUnaccent.contains("da nang") &&
                        (addressUnaccent.contains("dn") || addressUnaccent.contains("tp da nang"))) {
                        match = true;
                    } else if (provUnaccent.contains("hai phong") &&
                        (addressUnaccent.contains("hp") || addressUnaccent.contains("tp hai phong"))) {
                        match = true;
                    } else if (provUnaccent.contains("can tho") &&
                        (addressUnaccent.contains("ct") || addressUnaccent.contains("tp can tho"))) {
                        match = true;
                    }
                }

                if (match) {
                    centralHub = h;
                    break;
                }
            }
        }

        String centralHubCode = centralHub != null ? centralHub.getHubCode() : defaultCentralHub;

        // 2. Tìm Bưu cục Cấp 2/3 (Sub-hub / Post Office) thuộc Kho Tổng này theo Quận/Huyện
        String postOfficeCode = null;
        Hub defaultSubHub = null;
        for (Hub h : allHubs) {
            if (h.getHubLevel() != null && h.getHubLevel() == 2 && centralHubCode.equals(h.getParentHubCode())) {
                if (defaultSubHub == null) {
                    defaultSubHub = h;
                }
                if (h.getDistrict() != null) {
                    String distLower = h.getDistrict().toLowerCase();
                    String distUnaccent = unaccent(h.getDistrict());
                    if (addressLower.contains(distLower) || addressUnaccent.contains(distUnaccent)) {
                        postOfficeCode = h.getHubCode();
                        break;
                    }
                }
            }
        }

        if (postOfficeCode == null) {
            postOfficeCode = defaultSubHub != null ? defaultSubHub.getHubCode() : defaultPostOffice;
        }

        return new HubRoutingResult(centralHubCode, postOfficeCode);
    }

}
