package org.app.supportservice.ai.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

@FeignClient(name = "pricing-service")
public interface PricingAiClient {

    @PostMapping("/api/pricing/calculate")
    TariffQuoteResponse calculate(@RequestBody TariffQuoteRequest request);
}
