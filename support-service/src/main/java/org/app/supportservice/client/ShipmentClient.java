package org.app.supportservice.client;

import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;

import java.util.Map;

@FeignClient(name = "shipment-service", contextId = "shipmentClient")
public interface ShipmentClient {

    @PostMapping("/api/shipments/{code}/cancel")
    void cancelShipment(@PathVariable("code") String trackingCode,
                        @RequestBody(required = false) Map<String,String> cancelRequest,
                        @RequestHeader(value = "X-User-Roles", required = false) String roles,
                        @RequestHeader(value = "X-User-Permissions", required = false) String permissions);

}
