package org.app.pricingservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TariffCalculationResponse {

    private String senderProvince;
    private String senderDistrict;
    private String receiverProvince;
    private String receiverDistrict;
    private String routeDescription;
    private String zoneType;
    private Double actualWeightGram;
    private Double volumetricWeightGram;
    private Double chargeableWeightKg;
    private BigDecimal codAmount;
    private List<PlanDetail> plans;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PlanDetail {
        private String serviceCode;
        private String serviceName;
        private String estimatedDelivery;
        private BigDecimal baseFee;
        private BigDecimal fuelSurcharge;
        private BigDecimal codFee;
        private BigDecimal insuranceFee;
        private BigDecimal totalFee;
    }
}
