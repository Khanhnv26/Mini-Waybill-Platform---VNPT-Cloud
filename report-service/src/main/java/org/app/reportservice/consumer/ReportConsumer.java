package org.app.reportservice.consumer;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.app.reportservice.dto.event.CreateShipmentEvent;
import org.app.reportservice.dto.event.ShipmentStatusUpdatedEvent;
import org.app.reportservice.service.ReportService;
import org.springframework.kafka.annotation.BackOff;
import org.springframework.kafka.annotation.DltHandler;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.annotation.RetryableTopic;
import org.springframework.kafka.support.KafkaHeaders;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class ReportConsumer {

    private final ReportService reportService;


    @KafkaListener(topics = "shipment-events", groupId = "report-service-group")
    @RetryableTopic(attempts = "3", backOff = @BackOff(delay = 1000, multiplier = 2))
    public void onShipmentCreated(CreateShipmentEvent event) {
       reportService.processShipmentCreated(event);
    }

    @KafkaListener(topics = "tracking-status-events", groupId = "report-service-group")
    @RetryableTopic(attempts = "3", backOff = @BackOff(delay = 1000, multiplier = 2))
    public void onTrackingStatusUpdated(ShipmentStatusUpdatedEvent event) {
        reportService.processStatusUpdated(event);
    }

    @DltHandler
    public void handleDlt(Object payload, @Header(KafkaHeaders.RECEIVED_TOPIC) String topic) {
        log.error("[REPORT-SERVICE] Event trên topic {} đã thất bại sau các lần thử: {}", topic, payload);
    }
}
