package org.app.trackingservice.controller;

import lombok.RequiredArgsConstructor;
import org.app.trackingservice.entity.TrackingHistory;
import org.app.trackingservice.service.TrackingService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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
}
