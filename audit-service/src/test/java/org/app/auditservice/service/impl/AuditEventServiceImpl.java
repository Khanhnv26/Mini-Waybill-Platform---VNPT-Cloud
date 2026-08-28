package org.app.auditservice.service.impl;

import lombok.RequiredArgsConstructor;
import org.app.auditservice.entity.AuditEvent;
import org.app.auditservice.repository.AuditEventRepository;
import org.app.auditservice.service.AuditEventService;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AuditEventServiceImpl implements AuditEventService {

    private final AuditEventRepository auditEventRepository;

    @Override
    public List<AuditEvent> findByAggregateIdOrderByOccurredAtAsc(String aggregateId) {
        return auditEventRepository.findByAggregateIdOrderByOccurredAtAsc(aggregateId);
    }

}
