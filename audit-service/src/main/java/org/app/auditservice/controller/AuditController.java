package org.app.auditservice.controller;

import lombok.RequiredArgsConstructor;
import org.app.auditservice.entity.AuditEvent;
import org.app.auditservice.service.AuditEventService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/audits")
@RequiredArgsConstructor
public class AuditController {

    private final AuditEventService auditEventService;

    @GetMapping("/{trackingCode}")
    public ResponseEntity<List<AuditEvent>> getAuditEventsByTrackingCode(@PathVariable String trackingCode) {
        return ResponseEntity.ok(auditEventService.findByAggregateIdOrderByOccurredAtAsc(trackingCode));
    }
}