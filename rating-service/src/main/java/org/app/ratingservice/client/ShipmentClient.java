package org.app.ratingservice.client;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "shipment-service", contextId = "ratingShipmentClient")
public interface ShipmentClient {

    @GetMapping("/api/shipments/{code}")
    ShipmentDetailDto getShipmentByCode(@PathVariable("code") String code);

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    class ShipmentDetailDto {
        private String trackingCode;
        private String currentStatus;
        private String receiverPhone;
    }
}
