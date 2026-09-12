package org.app.routingservice.repository;

import org.app.routingservice.entity.HandlingEvent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface HandlingEventRepository extends JpaRepository<HandlingEvent, Long> {
    boolean existsByOperationId(String operationId);
    Optional<HandlingEvent> findByOperationId(String operationId);
    List<HandlingEvent> findByTrackingCodeOrderByOccurredAtAsc(String trackingCode);
}
