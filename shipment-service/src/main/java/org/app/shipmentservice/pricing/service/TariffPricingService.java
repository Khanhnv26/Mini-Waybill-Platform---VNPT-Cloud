package org.app.shipmentservice.pricing.service;

import org.app.shipmentservice.pricing.dto.CalculateTariffRequest;
import org.app.shipmentservice.pricing.dto.TariffCalculationResponse;

public interface TariffPricingService {

    TariffCalculationResponse calculateTariff(CalculateTariffRequest request);
}
