package org.app.ratingservice.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.app.ratingservice.dto.request.UpdateRatingVisibilityRequest;
import org.app.ratingservice.dto.response.AdminRatingItemResponse;
import org.app.ratingservice.dto.response.RatingPageResponse;
import org.app.ratingservice.dto.response.RatingStatsResponse;
import org.app.ratingservice.service.RatingService;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/ratings/admin")
@RequiredArgsConstructor
public class AdminRatingController {

    private final RatingService ratingService;

    @GetMapping
    public ResponseEntity<RatingPageResponse> getAdminRatings(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Integer star,
            @RequestParam(required = false) Boolean isNegative,
            @RequestParam(required = false) String courierCode,
            @RequestParam(required = false) Boolean isHidden,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime toDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt,desc") String sort
    ) {
        String[] sortParts = sort.split(",");
        String sortProperty = sortParts[0].trim();
        Sort s = (sortParts.length > 1 && "asc".equalsIgnoreCase(sortParts[1].trim()))
                ? Sort.by(sortProperty).ascending()
                : Sort.by(sortProperty).descending();
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.max(size, 1), s);

        return ResponseEntity.ok(ratingService.getAdminRatings(keyword, star, isNegative, courierCode, isHidden, fromDate, toDate, pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<AdminRatingItemResponse> getRatingDetail(@PathVariable("id") Long id) {
        return ResponseEntity.ok(ratingService.getRatingDetail(id));
    }

    @PatchMapping("/{id}/visibility")
    public ResponseEntity<AdminRatingItemResponse> updateRatingVisibility(
            @PathVariable("id") Long id,
            @Valid @RequestBody UpdateRatingVisibilityRequest request,
            @RequestHeader(value = "X-User-Email", required = false) String userEmail,
            @RequestHeader(value = "X-User-Id", required = false) String userId
    ) {
        String actor = (userEmail != null && !userEmail.isBlank()) ? userEmail : userId;
        return ResponseEntity.ok(ratingService.updateRatingVisibility(id, request, actor));
    }

    @GetMapping("/stats")
    public ResponseEntity<RatingStatsResponse> getRatingStats() {
        return ResponseEntity.ok(ratingService.getRatingStats());
    }
}
