package org.app.routingservice.controller;

import lombok.RequiredArgsConstructor;
import org.app.routingservice.dto.eta.EtaCalculationRequest;
import org.app.routingservice.dto.eta.EtaCalculationResponse;
import org.app.routingservice.service.DeliveryEtaService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/routing/eta")
public class EtaController {
    private final DeliveryEtaService deliveryEtaService;

    @PostMapping("/calculate")
    public ResponseEntity<EtaCalculationResponse> calculateEta(
            @RequestBody EtaCalculationRequest request) {
        EtaCalculationResponse response = deliveryEtaService.calculateDeliveryEta(request);
        return ResponseEntity.ok(response);
    }
}
