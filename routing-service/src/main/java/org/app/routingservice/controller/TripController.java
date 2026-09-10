package org.app.routingservice.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.app.routingservice.dto.trip.ConsolidateRequest;
import org.app.routingservice.dto.trip.CreateTripRequest;
import org.app.routingservice.dto.trip.TripDetailResponse;
import org.app.routingservice.service.TripService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/routing/trips")
@RequiredArgsConstructor
@Slf4j
public class TripController {

    private final TripService tripService;

    @PostMapping
    public ResponseEntity<TripDetailResponse> createTrip(@RequestBody @Valid CreateTripRequest request) {
        TripDetailResponse response = tripService.createTrip(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public ResponseEntity<List<TripDetailResponse>> getAllTrips() {
        List<TripDetailResponse> trips = tripService.getAllTrips();
        return ResponseEntity.ok(trips);
    }

    @GetMapping("/{id}")
    public ResponseEntity<TripDetailResponse> getTripDetail(@PathVariable Long id) {
        TripDetailResponse tripDetail = tripService.getTripDetail(id);
        return ResponseEntity.ok(tripDetail);
    }

    @PostMapping("/{id}/consolidate")
    public ResponseEntity<TripDetailResponse> autoConsolidate(@PathVariable Long id, @RequestBody(required = false) ConsolidateRequest request) {
        TripDetailResponse response = tripService.autoConsolidate(id, request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/remove-item")
    public ResponseEntity<TripDetailResponse> removeManifestItem(@PathVariable Long id, @RequestParam String trackingCode) {
        TripDetailResponse response = tripService.removeManifestItem(id, trackingCode);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/depart")
    public ResponseEntity<TripDetailResponse> departTrip(@PathVariable Long id) {
        TripDetailResponse response = tripService.departTrip(id);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/arrive")
    public ResponseEntity<TripDetailResponse> arriveAtStop(@PathVariable Long id, @RequestParam String hubCode) {
        TripDetailResponse response = tripService.arriveAtStop(id, hubCode);
        return ResponseEntity.ok(response);
    }

}
