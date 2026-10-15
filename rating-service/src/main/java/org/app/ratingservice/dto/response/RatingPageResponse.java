package org.app.ratingservice.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RatingPageResponse {

    private List<AdminRatingItemResponse> content;
    private int page;
    private int size;
    private int totalPages;
    private long totalElements;
}
