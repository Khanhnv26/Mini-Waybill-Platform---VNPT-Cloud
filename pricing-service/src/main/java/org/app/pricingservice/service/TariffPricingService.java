package org.app.pricingservice.service;

import org.app.pricingservice.dto.CalculateTariffRequest;
import org.app.pricingservice.dto.TariffCalculationResponse;

public interface TariffPricingService {

    TariffCalculationResponse calculateTariff(CalculateTariffRequest request);
}
