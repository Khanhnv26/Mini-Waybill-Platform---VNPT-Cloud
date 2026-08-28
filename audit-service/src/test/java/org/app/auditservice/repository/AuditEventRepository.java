package org.app.auditservice.repository;

import org.app.auditservice.entity.AuditEvent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AuditEventRepository extends JpaRepository<AuditEvent, Long> {
    List<AuditEvent> findByAggregateIdOrderByOccurredAtAsc(String aggregateId);
}
