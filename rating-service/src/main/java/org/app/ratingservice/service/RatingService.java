package org.app.ratingservice.service;

import org.app.ratingservice.dto.request.CreateRatingRequest;
import org.app.ratingservice.dto.request.UpdateRatingVisibilityRequest;
import org.app.ratingservice.dto.response.AdminRatingItemResponse;
import org.app.ratingservice.dto.response.RatingPageResponse;
import org.app.ratingservice.dto.response.RatingResponse;
import org.app.ratingservice.dto.response.RatingStatsResponse;
import org.app.ratingservice.dto.response.RatingStatusResponse;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;

public interface RatingService {
    RatingStatusResponse checkRatingStatus(String trackingCode);
    RatingResponse submitRating(CreateRatingRequest request);
    RatingPageResponse getAdminRatings(String keyword, Integer star, Boolean isNegative, String courierCode, Boolean isHidden, LocalDateTime fromDate, LocalDateTime toDate, Pageable pageable);
    AdminRatingItemResponse getRatingDetail(Long id);
    AdminRatingItemResponse updateRatingVisibility(Long id, UpdateRatingVisibilityRequest request, String actor);
    RatingStatsResponse getRatingStats();
}
