package org.app.shipmentservice.scheduler;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.app.shipmentservice.dto.event.ShipmentStatusUpdatedEvent;
import org.app.shipmentservice.entity.OutBoxEvent;
import org.app.shipmentservice.repository.OutboxEventRepository;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.TimeUnit;

@Component
@RequiredArgsConstructor
@Slf4j
public class OutboxPublisherScheduler {

    private final OutboxEventRepository outboxEventRepository;
    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final ObjectMapper objectMapper;


    @Scheduled(fixedDelay = 2000)
    public void publishPendingEvents() {
        List<OutBoxEvent> pendingEvents = outboxEventRepository.findTop50ByStatusOrderByCreatedAtAsc("PENDING");
        if(pendingEvents.isEmpty()) {
            return;
        }

        for (OutBoxEvent event : pendingEvents) {
            try {
                ShipmentStatusUpdatedEvent payload = objectMapper.readValue(event.getPayload(), ShipmentStatusUpdatedEvent.class);

                // send() chỉ là "đưa thư", .get() mới là "chờ Kafka xác nhận đã nhận"
                kafkaTemplate.send("tracking-status-events", event.getAggregateId(), payload)
                        .get(5, TimeUnit.SECONDS);

                event.setStatus("SENT");
                event.setProcessedAt(LocalDateTime.now());
                outboxEventRepository.save(event);

                log.info("[OUTBOX] Đã bắn event {} thành công cho đơn {}", event.getEventType(), event.getAggregateId());

            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                log.error("[OUTBOX] Bị ngắt khi chờ Kafka ack cho event {}", event.getId());
            } catch (Exception e) {
                // Giữ nguyên PENDING, 2 giây nữa vòng quét sau sẽ gửi lại
                log.error("[OUTBOX] Gửi thất bại event {}: {}", event.getId(), e.getMessage());
            }
        }
    }
}
