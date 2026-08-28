package org.app.shipmentservice.client;

import org.app.shipmentservice.dto.response.CustomerValidationResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "customer-service")
public interface CustomerClient {

    @GetMapping("/api/customers/{id}/validation")
    CustomerValidationResponse validateCustomer(@PathVariable("id") Long id);
}
