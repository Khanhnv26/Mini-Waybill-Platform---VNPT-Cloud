package org.app.reportservice.consumer;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.app.reportservice.dto.event.CreateShipmentEvent;
import org.app.reportservice.dto.event.ShipmentStatusUpdatedEvent;
import org.app.reportservice.service.ReportService;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class ReportConsumer {

    private final ReportService reportService;


    @KafkaListener(topics = "shipment-events", groupId = "report-service-group")
    public void onShipmentCreated(CreateShipmentEvent event) {
       reportService.processShipmentCreated(event);
    }

    @KafkaListener(topics = "tracking-status-events",groupId = "report-service-group")
    public void onTrackingStatusUpdated(ShipmentStatusUpdatedEvent event) {
        reportService.processStatusUpdated(event);
    }
}
