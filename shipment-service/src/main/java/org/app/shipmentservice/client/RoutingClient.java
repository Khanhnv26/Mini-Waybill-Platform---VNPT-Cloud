package org.app.shipmentservice.client;

import org.app.shipmentservice.dto.request.EtaCalculationRequest;
import org.app.shipmentservice.dto.response.EtaCalculationResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

@FeignClient(name = "routing-service")
public interface RoutingClient {

    @PostMapping("/api/routing/eta/calculate")
    EtaCalculationResponse calculateEta(@RequestBody EtaCalculationRequest request);
}
