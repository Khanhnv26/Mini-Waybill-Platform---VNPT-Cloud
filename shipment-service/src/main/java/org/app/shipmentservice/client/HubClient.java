package org.app.shipmentservice.client;

import org.app.shipmentservice.dto.response.HubResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;

import java.util.List;

@FeignClient(name = "routing-service")
public interface HubClient {

    @GetMapping("/api/routing/hubs")
    List<HubResponse> getAllHubs();
}
