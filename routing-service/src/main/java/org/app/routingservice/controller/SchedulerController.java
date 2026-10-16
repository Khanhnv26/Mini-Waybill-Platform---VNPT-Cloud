package org.app.routingservice.controller;

import lombok.RequiredArgsConstructor;
import org.app.routingservice.dto.trip.SchedulerConfigRequest;
import org.app.routingservice.dto.trip.SchedulerConfigResponse;
import org.app.routingservice.service.TripScheduleManager;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/routing/scheduler")
@RequiredArgsConstructor
public class SchedulerController {

    private final TripScheduleManager tripScheduleManager;

    @GetMapping("/config")
    public ResponseEntity<SchedulerConfigResponse> getConfig() {
        return ResponseEntity.ok(tripScheduleManager.getConfig());
    }

    @PostMapping("/config")
    public ResponseEntity<SchedulerConfigResponse> updateConfig(@RequestBody SchedulerConfigRequest request,
            @RequestHeader(value = "X-User-Roles", required = false) String roles) {
        if (!org.app.sharedevents.security.RoleAccess.hasAny(roles, "ADMIN", "DISPATCHER")) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN);
        }
        return ResponseEntity.ok(tripScheduleManager.updateConfig(request));
    }
}

