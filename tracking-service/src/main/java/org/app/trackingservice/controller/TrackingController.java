package org.app.trackingservice.controller;

import lombok.RequiredArgsConstructor;
import org.app.trackingservice.dto.request.UpdateStatusRequest;
import org.app.trackingservice.entity.TrackingHistory;
import org.app.trackingservice.service.TrackingService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/tracking")
@RequiredArgsConstructor
public class TrackingController {

    private final TrackingService trackingService;

    @GetMapping("/{trackingCode}")
    public ResponseEntity<Map<String, String>> getCurrentStatus(@PathVariable String trackingCode) {
        Map<String, String> status = trackingService.getCurrentStatus(trackingCode);
        return ResponseEntity.ok(status);
    }

    @GetMapping("/{trackingCode}/history")
    public ResponseEntity<List<TrackingHistory>> getTrackingHistory(@PathVariable String trackingCode) {
        List<TrackingHistory> history = trackingService.getTrackingHistory(trackingCode);
        return ResponseEntity.ok(history);
    }

    @PostMapping("/{trackingCode}/status")
    public ResponseEntity<TrackingHistory> updateStatus(@PathVariable String trackingCode,
                                                        @RequestBody UpdateStatusRequest request,
                                                        @RequestHeader(value = "X-User-Roles", required = false) String roles,
                                                        @RequestHeader(value = "X-User-Permissions", required = false) String permissions) {
        TrackingHistory history = trackingService.updateStatus(trackingCode, request, roles, permissions);
        return ResponseEntity.ok(history);
    }
}
