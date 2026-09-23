package org.app.supportservice.ai.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class TariffQuoteResponse {
    private String routeDescription;
    private String zoneType;
    private Double chargeableWeightKg;
    private List<PlanDetail> plans;

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class PlanDetail {
        private String serviceCode;
        private String serviceName;
        private String estimatedDelivery;
        private BigDecimal baseFee;
        private BigDecimal fuelSurcharge;
        private BigDecimal totalFee;
    }
}
