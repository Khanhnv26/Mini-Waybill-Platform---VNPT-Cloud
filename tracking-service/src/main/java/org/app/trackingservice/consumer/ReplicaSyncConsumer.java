package org.app.trackingservice.consumer;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.app.trackingservice.config.DBType;
import org.app.trackingservice.config.DataSourceContextHolder;
import org.app.trackingservice.entity.TrackingHistory;
import org.app.trackingservice.repository.TrackingHistoryRepository;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

@Service
@Slf4j
@RequiredArgsConstructor
public class ReplicaSyncConsumer {
    private final TrackingHistoryRepository trackingHistoryRepository;

    @KafkaListener(topics = "tracking-replica-sync", groupId = "tracking-replica-sync-group")
    public void handleSyncToReplica(TrackingHistory history) {
        try {
            DataSourceContextHolder.set(DBType.REPLICA);
            history.setId(null);
            trackingHistoryRepository.save(history);
        } catch (Exception e) {
            log.error("Không thể đồng bộ sang Replica: {}", e.getMessage());
        } finally {
            DataSourceContextHolder.clear();
        }

    }

}
