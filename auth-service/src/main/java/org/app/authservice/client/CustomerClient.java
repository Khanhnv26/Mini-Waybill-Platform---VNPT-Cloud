package org.app.authservice.client;

import org.app.authservice.dto.request.InitCustomerProfileRequest;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

@FeignClient(name = "customer-service")
public interface CustomerClient {

    @PostMapping("/api/customers/internal/init-profile")
    void initProfile(@RequestBody InitCustomerProfileRequest request);
}
