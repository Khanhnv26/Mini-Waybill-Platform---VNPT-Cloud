package org.app.routingservice.service;


import org.app.routingservice.dto.eta.EtaCalculationRequest;
import org.app.routingservice.dto.eta.EtaCalculationResponse;

public interface DeliveryEtaService {
    EtaCalculationResponse calculateDeliveryEta(EtaCalculationRequest request);

}
