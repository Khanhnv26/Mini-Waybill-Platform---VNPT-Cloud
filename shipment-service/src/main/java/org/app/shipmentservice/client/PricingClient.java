package org.app.shipmentservice.client;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

import java.math.BigDecimal;
import java.util.List;

@FeignClient(name = "pricing-service")
public interface PricingClient {

    @PostMapping("/api/pricing/calculate")
    TariffResponse calculateTariff(@RequestBody TariffRequest request);

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    class TariffRequest {
        private String senderProvince;
        private String senderDistrict;
        private String receiverProvince;
        private String receiverDistrict;
        private Double weightGram;
        private Double lengthCm;
        private Double widthCm;
        private Double heightCm;
        private BigDecimal codAmount;
        private BigDecimal declaredValue;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    class TariffResponse {
        private String senderProvince;
        private String receiverProvince;
        private String zoneType;
        private Double chargeableWeightKg;
        private List<PlanDetail> plans;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    class PlanDetail {
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
