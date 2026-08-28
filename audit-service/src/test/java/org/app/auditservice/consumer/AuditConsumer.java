package org.app.auditservice.consumer;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.app.auditservice.entity.AuditEvent;
import org.app.auditservice.repository.AuditEventRepository;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuditConsumer {

    private final AuditEventRepository auditRepository;

    @KafkaListener(topics = "shipment-events", groupId = "audit-group")
    public void auditShipmentCreated(ConsumerRecord<String, String> record) {
        log.info("[AUDIT] Ghi log sự kiện SHIPMENT_CREATED cho đơn: {}", record.key());

        AuditEvent auditEvent = AuditEvent.builder()
                .eventId(UUID.randomUUID().toString())
                .eventType("SHIPMENT_CREATED")
                .aggregateId(record.key()) // record.key() chính là trackingCode!
                .payload(record.value())  // record.value() chính là toàn bộ chuỗi JSON!
                .occurredAt(LocalDateTime.now())
                .build();

        auditRepository.save(auditEvent);
    }


    @KafkaListener(topics = "route-assigned", groupId = "audit-group")
    public void auditRouteAssigned(ConsumerRecord<String, String> record) {
        log.info("[AUDIT] Ghi log sự kiện ROUTE_ASSIGNED cho đơn: {}", record.key());

        AuditEvent auditEvent = AuditEvent.builder()
                .eventId(UUID.randomUUID().toString())
                .eventType("ROUTE_ASSIGNED")
                .aggregateId(record.key())
                .payload(record.value())
                .occurredAt(LocalDateTime.now())
                .build();

        auditRepository.save(auditEvent);
    }
}