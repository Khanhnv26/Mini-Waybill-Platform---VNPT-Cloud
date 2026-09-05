package org.app.routingservice.consumer;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.app.routingservice.dto.event.CreateShipmentEvent;
import org.app.routingservice.dto.event.RouteAssignedEvent;
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

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class RoutingConsumer {

    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final RoutingAssignmentRepository routingAssignmentRepository;
    private final HubRepository hubRepository;

    @KafkaListener(topics = "shipment-events", groupId = "routing-group")
    @RetryableTopic(attempts = "3", backOff = @BackOff(delay = 1000, multiplier = 2))
    public void handleShipmentCreatedEvent(CreateShipmentEvent event) {
        log.info("[ROUTING-SERVICE] Nhận được event tạo đơn mới: trackingCode = {}", event.getTrackingCode());

        String sourceHub = determineHub(event.getSenderAddress(), "HUB-HN-01");
        String destinationHub = determineHub(event.getReceiverAddress(), "HUB-HCM-01");
        String routeCode = "ROUTE-" + sourceHub + "-TO-" + destinationHub;

        RoutingAssignment assignment = RoutingAssignment.builder()
                .trackingCode(event.getTrackingCode())
                .sourceHub(sourceHub)
                .destinationHub(destinationHub)
                .routeCode(routeCode)
                .status("ASSIGNED")
                .assignedAt(LocalDateTime.now())
                .build();
        routingAssignmentRepository.save(assignment);
        log.info("[ROUTING-SERVICE] Phân tuyến thành công cho đơn {}: {}", event.getTrackingCode(), routeCode);

        RouteAssignedEvent routeEvent = RouteAssignedEvent.builder()
                .trackingCode(event.getTrackingCode())
                .sourceHub(sourceHub)
                .destinationHub(destinationHub)
                .routeCode(routeCode)
                .status("ASSIGNED")
                .assignedAt(LocalDateTime.now())
                .build();

        kafkaTemplate.send("route-assigned", event.getTrackingCode(), routeEvent);
        log.info("[ROUTING-SERVICE] Đã bắn event RouteAssignedEvent lên topic 'route-assigned'");

    }

    @DltHandler
    public void handleDlt(CreateShipmentEvent event,
                          @Header(KafkaHeaders.RECEIVED_TOPIC) String topic,
                          @Header(KafkaHeaders.OFFSET) long offset){
        log.error("[ROUTING-SERVICE] Event CreateShipmentEvent với trackingCode {} đã thất bại sau 3 lần thử. Gửi vào DLT để xử lý thủ công.", event.getTrackingCode());
    }

    private String determineHub(String address, String defaultHub) {
        if (address == null || address.isBlank()) return defaultHub;

        List<Hub> hubs = hubRepository.findAll();
        String addressLower = address.toLowerCase();
        for (Hub hub : hubs) {
            if(hub.getProvince() != null && addressLower.contains(hub.getProvince().toLowerCase())) {
                log.info("[ROUTING] Tìm thấy Hub phù hợp từ DB: {} ({}) cho địa chỉ '{}'", hub.getHubCode(), hub.getProvince(), address);
                return hub.getHubCode();
            }
        }

        log.warn("[ROUTING] Không tìm thấy Hub khớp cho địa chỉ '{}', dùng Hub mặc định: {}", address, defaultHub);
        return defaultHub;
    }

}
