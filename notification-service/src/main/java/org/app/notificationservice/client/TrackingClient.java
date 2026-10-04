package org.app.notificationservice.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;

import java.util.Map;

@FeignClient(name = "tracking-service")
public interface TrackingClient {

    @PostMapping("/api/tracking/{trackingCode}/status")
    Map<String, Object> updateStatus(
            @PathVariable("trackingCode") String trackingCode,
            @RequestBody Map<String, Object> request,
            @RequestHeader("X-User-Roles") String roles);
}
