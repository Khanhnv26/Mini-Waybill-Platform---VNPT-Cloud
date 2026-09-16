package org.app.notificationservice.client;

import org.app.notificationservice.dto.response.ShipmentDetailResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "shipment-service")
public interface ShipmentClient {
    @GetMapping("/api/shipments/{code}")
    ShipmentDetailResponse getShipmentByCode(@PathVariable("code") String code);
}