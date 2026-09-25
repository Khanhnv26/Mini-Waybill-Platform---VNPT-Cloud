package org.app.ratingservice.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.time.LocalDateTime;
import java.util.List;

@FeignClient(name = "tracking-service", contextId = "ratingTrackingClient")
public interface TrackingClient {

    @GetMapping("/api/tracking/{trackingCode}/history")
    List<TrackingHistoryDto> getTrackingHistory(@PathVariable("trackingCode") String trackingCode);

    @Data
    @NoArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    class TrackingHistoryDto {
        private String operationType;
        private String actorId;
        private LocalDateTime occurredAt;
    }
}
