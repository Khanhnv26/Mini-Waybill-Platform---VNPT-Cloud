package org.app.notificationservice.client;
import org.app.notificationservice.dto.response.ShipperLookupResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

import java.util.Map;

@FeignClient(name = "shipper-service")
public interface ShipperClient {

    @GetMapping("/api/shippers/internal/by-courier/{courierCode}")
    ShipperLookupResponse findByCourierCode(@PathVariable("courierCode") String courierCode);

    @PostMapping("/api/shippers/internal/link-telegram")
    Map<String, Object> linkTelegram(@RequestBody Map<String, String> request);



}
