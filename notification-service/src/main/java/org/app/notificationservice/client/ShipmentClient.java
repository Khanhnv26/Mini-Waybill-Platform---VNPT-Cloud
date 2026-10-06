package org.app.notificationservice.client;

import org.app.notificationservice.dto.response.ReturnRequestResponse;
import org.app.notificationservice.dto.response.ShipmentDetailResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

import java.util.List;
import java.util.Map;

@FeignClient(name = "shipment-service")
public interface ShipmentClient {

    @GetMapping("/api/shipments/{code}")
    ShipmentDetailResponse getShipmentByCode(@PathVariable("code") String code);

    @GetMapping(value = "/api/shipments/{code}/return-request", headers = {"X-User-Roles=ROLE_SHIPPER"})
    ReturnRequestResponse getReturnRequest(@PathVariable("code") String code);

    @PostMapping("/api/shipments/cod/submit-settlement")
    List<Object> submitCodSettlement(@RequestBody Map<String, Object> request);
}
