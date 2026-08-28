package org.app.routingservice.consumer;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.app.routingservice.dto.event.CreateShipmentEvent;
import org.app.routingservice.dto.event.RouteAssignedEvent;
import org.app.routingservice.entity.RoutingAssignment;
import org.app.routingservice.repository.RoutingAssignmentRepository;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.annotation.RetryableTopic;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.retry.annotation.Backoff;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class RoutingConsumer {

    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final RoutingAssignmentRepository routingAssignmentRepository;

    @KafkaListener(topics = "shipment-events", groupId = "routing-group")
    @RetryableTopic(attempts = "3")
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

    private String determineHub(String address, String defaultHub) {
        if (address == null) return defaultHub;
        String addrLower = address.toLowerCase();
        if (addrLower.contains("hà nội") || addrLower.contains("ha noi")) return "HUB-HN-01";
        if (addrLower.contains("đà nẵng") || addrLower.contains("da nang")) return "HUB-DN-01";
        if (addrLower.contains("hồ chí minh") || addrLower.contains("hcm")) return "HUB-HCM-01";
        return defaultHub;
    }

}
