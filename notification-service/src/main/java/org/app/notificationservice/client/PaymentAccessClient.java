package org.app.notificationservice.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;

@FeignClient(name = "payment-service", contextId = "paymentAccessClient")
public interface PaymentAccessClient {
    @GetMapping("/api/payments/tracking/{code}")
    void check(@PathVariable("code") String code, @RequestHeader("X-User-Id") String id,
               @RequestHeader("X-User-Roles") String roles);
}
