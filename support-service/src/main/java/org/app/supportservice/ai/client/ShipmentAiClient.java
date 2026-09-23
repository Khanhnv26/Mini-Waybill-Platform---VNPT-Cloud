package org.app.supportservice.ai.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "shipment-service")
public interface ShipmentAiClient {

    @GetMapping("/api/shipments/{code}")
    ShipmentSnapshot getByCode(@PathVariable("code") String code);
}
