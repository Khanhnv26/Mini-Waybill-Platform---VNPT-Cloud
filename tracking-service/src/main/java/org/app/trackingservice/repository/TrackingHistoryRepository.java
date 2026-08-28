package org.app.trackingservice.repository;

import org.app.trackingservice.entity.TrackingHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TrackingHistoryRepository extends JpaRepository<TrackingHistory, Long> {
    List<TrackingHistory> findByTrackingCodeOrderByOccurredAtAsc(String trackingCode);

    Optional<TrackingHistory> findTopByTrackingCodeOrderByOccurredAtDesc(String trackingCode);
}
