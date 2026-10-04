package org.app.notificationservice.client;

import org.app.notificationservice.dto.response.ShipperForecastResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "routing-service", contextId = "forecastClient")
public interface ForecastClient {

    @GetMapping("/api/routing/forecast/shipper/{courierCode}")
    ShipperForecastResponse getShipperForecast(@PathVariable("courierCode") String courierCode);
}
