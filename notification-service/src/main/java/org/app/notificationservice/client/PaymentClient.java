package org.app.notificationservice.client;

import org.app.notificationservice.dto.response.PaymentResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

import java.util.Map;

@FeignClient(name = "payment-service")
public interface PaymentClient {

    @PostMapping("/api/payments/create-qr")
    PaymentResponse createQr(@RequestBody Map<String, Object> request);

    @GetMapping("/api/payments/tracking/{trackingCode}")
    PaymentResponse getByTracking(@PathVariable("trackingCode") String trackingCode);

    @PostMapping("/api/payments/mock-pay/{trackingCode}")
    Map<String, Object> mockPay(@PathVariable("trackingCode") String trackingCode);
}