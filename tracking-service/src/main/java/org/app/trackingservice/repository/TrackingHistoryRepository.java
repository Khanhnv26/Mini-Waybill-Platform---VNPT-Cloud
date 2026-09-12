package org.app.trackingservice.repository;

import org.app.trackingservice.entity.TrackingHistory;
import org.app.sharedevents.entity.OperationType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TrackingHistoryRepository extends JpaRepository<TrackingHistory, Long> {
    List<TrackingHistory> findByTrackingCodeOrderByOccurredAtAsc(String trackingCode);

    Optional<TrackingHistory> findTopByTrackingCodeOrderByOccurredAtDesc(String trackingCode);

    long countByTrackingCodeAndStatus(String trackingCode, String status);

    boolean existsByEventId(String eventId);

    Optional<TrackingHistory> findTopByTrackingCodeAndStatusOrderByOccurredAtDesc(String trackingCode, String status);

    Optional<TrackingHistory> findTopByTrackingCodeAndStatusAndOperationTypeOrderByOccurredAtDesc(
            String trackingCode,
            String status,
            OperationType operationType
    );

}
