package org.app.ratingservice.dto.response;


import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RatingStatusResponse {
    private String trackingCode;
    private boolean isDelivered;
    private boolean hasRated;
    private Integer serviceRating;
    private Integer shipperRating;
}
