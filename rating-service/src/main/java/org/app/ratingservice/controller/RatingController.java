package org.app.ratingservice.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.app.ratingservice.dto.request.CreateRatingRequest;
import org.app.ratingservice.dto.response.RatingResponse;
import org.app.ratingservice.dto.response.RatingStatusResponse;
import org.app.ratingservice.service.RatingService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/ratings")
@RequiredArgsConstructor
public class RatingController {

    private final RatingService ratingService;

    @GetMapping("/{trackingCode}/status")
    public ResponseEntity<RatingStatusResponse> checkStatus(@PathVariable("trackingCode") String trackingCode) {
        return ResponseEntity.ok(ratingService.checkRatingStatus(trackingCode));
    }

    @PostMapping
    public ResponseEntity<RatingResponse> submitRating(@Valid @RequestBody CreateRatingRequest request) {
        RatingResponse response = ratingService.submitRating(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}
