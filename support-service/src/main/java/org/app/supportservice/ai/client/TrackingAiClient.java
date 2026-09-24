package org.app.supportservice.ai.client;

import org.app.supportservice.ai.dto.response.TrackingEventView;
import org.app.supportservice.ai.dto.response.TrackingStatusView;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.List;

@FeignClient(name = "tracking-service")
public interface TrackingAiClient {

    @GetMapping("/api/tracking/{trackingCode}")
    TrackingStatusView getCurrentStatus(@PathVariable("trackingCode") String trackingCode);

    @GetMapping("/api/tracking/{trackingCode}/history")
    List<TrackingEventView> getHistory(@PathVariable("trackingCode") String trackingCode);
}
