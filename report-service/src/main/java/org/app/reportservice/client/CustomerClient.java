package org.app.reportservice.client;

import org.app.reportservice.dto.CustomerValidationResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "customer-service")
public interface CustomerClient {

    @GetMapping("/api/customers/by-user/{userId}/validation")
    CustomerValidationResponse validateByUserId(@PathVariable("userId") Long userId);
}
