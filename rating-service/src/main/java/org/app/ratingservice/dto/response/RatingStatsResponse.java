package org.app.ratingservice.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RatingStatsResponse {

    private Double averageServiceRating;
    private Double averageShipperRating;
    private Long totalRatings;
    private Long visibleRatingsCount;
    private Long hiddenRatingsCount;
    private Long negativeRatingsCount;
    private Map<Integer, Long> starDistribution;
}
