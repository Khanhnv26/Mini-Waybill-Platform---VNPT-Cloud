package org.app.auditservice.service;

import org.app.auditservice.entity.AuditEvent;

import java.util.List;

public interface AuditEventService {
    List<AuditEvent> findByAggregateIdOrderByOccurredAtAsc(String aggregateId);
}
