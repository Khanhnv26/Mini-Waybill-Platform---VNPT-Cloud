package org.app.supportservice.ai.client;

import org.app.supportservice.ai.dto.request.TariffQuoteRequest;
import org.app.supportservice.ai.dto.response.TariffQuoteResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

@FeignClient(name = "shipment-service", contextId = "pricingAiClient")
public interface PricingAiClient {

    @PostMapping("/api/pricing/calculate")
    TariffQuoteResponse calculate(@RequestBody TariffQuoteRequest request);
}
