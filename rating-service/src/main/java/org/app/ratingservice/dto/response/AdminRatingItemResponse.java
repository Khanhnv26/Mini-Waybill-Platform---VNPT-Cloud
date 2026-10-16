package org.app.ratingservice.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminRatingItemResponse {

    private Long id;
    private String trackingCode;
    private String courierCode;
    private Integer serviceRating;
    private Integer shipperRating;
    private List<String> tags;
    private String comment;
    private List<String> attachmentUrls;
    private String verifiedPhone;
    private LocalDateTime createdAt;
    private Boolean isHidden;
    private String hiddenReason;
    private String hiddenBy;
    private LocalDateTime hiddenAt;
}
