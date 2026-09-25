package org.app.ratingservice.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class RatingResponse {
    private Long id;
    private String trackingCode;
    private Integer serviceRating;
    private Integer shipperRating;
    private String messages;
    private boolean suggestTicket;
    private LocalDateTime createdAt;
}
