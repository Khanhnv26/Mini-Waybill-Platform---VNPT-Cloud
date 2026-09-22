package org.app.pricingservice.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.app.pricingservice.dto.CalculateTariffRequest;
import org.app.pricingservice.dto.TariffCalculationResponse;
import org.app.pricingservice.service.TariffPricingService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/pricing")
@RequiredArgsConstructor
public class PricingController {

    private final TariffPricingService tariffPricingService;

    @PostMapping("/calculate")
    public ResponseEntity<TariffCalculationResponse> calculateTariff(@Valid @RequestBody CalculateTariffRequest request) {
        return ResponseEntity.ok(tariffPricingService.calculateTariff(request));
    }
}
