package org.app.ratingservice.service;

import org.app.ratingservice.dto.request.CreateRatingRequest;
import org.app.ratingservice.dto.response.RatingResponse;
import org.app.ratingservice.dto.response.RatingStatusResponse;

public interface RatingService {
    RatingStatusResponse checkRatingStatus(String trackingCode);
    RatingResponse submitRating(CreateRatingRequest request);
}
