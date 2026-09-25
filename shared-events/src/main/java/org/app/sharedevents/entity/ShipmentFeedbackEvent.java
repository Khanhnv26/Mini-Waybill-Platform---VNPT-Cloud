package org.app.sharedevents.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ShipmentFeedbackEvent implements Serializable {

    private String eventId;
    private String trackingCode;
    private String courierCode;
    private Integer serviceRating;
    private Integer shipperRating;
    private List<String> tags;
    private String comment;
    private LocalDateTime createdAt;

}
