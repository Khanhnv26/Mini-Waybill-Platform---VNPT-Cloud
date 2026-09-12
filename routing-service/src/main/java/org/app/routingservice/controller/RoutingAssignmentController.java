package org.app.routingservice.controller;

import lombok.RequiredArgsConstructor;
import org.app.routingservice.entity.RoutingAssignment;
import org.app.routingservice.repository.RoutingAssignmentRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Locale;

@RestController
@RequestMapping("/api/routing/shipments")
@RequiredArgsConstructor
public class RoutingAssignmentController {

    private final RoutingAssignmentRepository routingAssignmentRepository;

    @GetMapping("/{trackingCode}/assignment")
    public ResponseEntity<RoutingAssignment> getAssignment(@PathVariable String trackingCode) {
        String normalizedCode = trackingCode == null ? "" : trackingCode.trim().toUpperCase(Locale.ROOT);
        if (normalizedCode.isBlank()) {
            return ResponseEntity.notFound().build();
        }
        return routingAssignmentRepository.findByTrackingCode(normalizedCode)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}
