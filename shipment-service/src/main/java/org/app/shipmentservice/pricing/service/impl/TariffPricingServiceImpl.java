package org.app.shipmentservice.pricing.service.impl;

import org.app.shipmentservice.pricing.dto.CalculateTariffRequest;
import org.app.shipmentservice.pricing.dto.TariffCalculationResponse;
import org.app.shipmentservice.pricing.dto.TariffCalculationResponse.PlanDetail;
import org.app.shipmentservice.pricing.service.TariffPricingService;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;

@Service
public class TariffPricingServiceImpl implements TariffPricingService {

    private static final BigDecimal FUEL_SURCHARGE_RATE = BigDecimal.valueOf(0.06);
    private static final BigDecimal COD_FEE_RATE = BigDecimal.valueOf(0.01);
    private static final BigDecimal MIN_COD_FEE = BigDecimal.valueOf(10000);
    private static final BigDecimal INSURANCE_FEE_RATE = BigDecimal.valueOf(0.005);

    @Override
    public TariffCalculationResponse calculateTariff(CalculateTariffRequest request) {
        double actualGram = request.getWeightGram() != null ? request.getWeightGram() : 500.0;
        double volumetricGram = 0.0;

        if (request.getLengthCm() != null && request.getWidthCm() != null && request.getHeightCm() != null) {
            volumetricGram = ((request.getLengthCm() * request.getWidthCm() * request.getHeightCm()) / 5000.0) * 1000.0;
        }

        double chargeableGram = Math.max(actualGram, volumetricGram);
        double chargeableKg = chargeableGram / 1000.0;

        boolean isIntraProvince = request.getSenderProvince() != null
                && request.getReceiverProvince() != null
                && request.getSenderProvince().trim().equalsIgnoreCase(request.getReceiverProvince().trim());

        String zoneType = isIntraProvince ? "INTRA_PROVINCE" : "INTER_REGION";

        String senderLabel = (request.getSenderDistrict() != null && !request.getSenderDistrict().isBlank())
                ? request.getSenderDistrict() + " (" + request.getSenderProvince() + ")"
                : request.getSenderProvince();

        String receiverLabel = (request.getReceiverDistrict() != null && !request.getReceiverDistrict().isBlank())
                ? request.getReceiverDistrict() + " (" + request.getReceiverProvince() + ")"
                : request.getReceiverProvince();

        String routeDescription = senderLabel + " → " + receiverLabel + (isIntraProvince ? " • Nội Tỉnh" : " • Liên Miền");

        BigDecimal codAmount = request.getCodAmount() != null ? request.getCodAmount() : BigDecimal.ZERO;
        BigDecimal codFee = BigDecimal.ZERO;
        if (codAmount.compareTo(BigDecimal.ZERO) > 0) {
            codFee = codAmount.multiply(COD_FEE_RATE).max(MIN_COD_FEE).setScale(0, RoundingMode.HALF_UP);
        }

        BigDecimal declaredValue = request.getDeclaredValue() != null ? request.getDeclaredValue() : BigDecimal.ZERO;
        BigDecimal insuranceFee = BigDecimal.ZERO;
        if (declaredValue.compareTo(BigDecimal.ZERO) > 0) {
            insuranceFee = declaredValue.multiply(INSURANCE_FEE_RATE).setScale(0, RoundingMode.HALF_UP);
        }

        List<PlanDetail> plans = new ArrayList<>();

        plans.add(buildPlan(
                "ECO",
                "VNPT Tiết Kiệm",
                isIntraProvince ? "1-2 ngày" : "3-4 ngày",
                isIntraProvince ? 15000.0 : 25000.0,
                isIntraProvince ? 5000.0 : 9000.0,
                chargeableKg,
                codFee,
                insuranceFee
        ));

        plans.add(buildPlan(
                "STANDARD",
                "VNPT Tiêu Chuẩn",
                isIntraProvince ? "Trong 24 giờ" : "1-2 ngày",
                isIntraProvince ? 20000.0 : 30000.0,
                isIntraProvince ? 7000.0 : 13000.0,
                chargeableKg,
                codFee,
                insuranceFee
        ));

        plans.add(buildPlan(
                "EXPRESS",
                "VNPT Hỏa Tốc",
                isIntraProvince ? "4-6 giờ" : "12-24 giờ",
                isIntraProvince ? 35000.0 : 55000.0,
                isIntraProvince ? 12000.0 : 22000.0,
                chargeableKg,
                codFee,
                insuranceFee
        ));

        return TariffCalculationResponse.builder()
                .senderProvince(request.getSenderProvince())
                .senderDistrict(request.getSenderDistrict())
                .receiverProvince(request.getReceiverProvince())
                .receiverDistrict(request.getReceiverDistrict())
                .routeDescription(routeDescription)
                .zoneType(zoneType)
                .actualWeightGram(Math.round(actualGram * 10.0) / 10.0)
                .volumetricWeightGram(Math.round(volumetricGram * 10.0) / 10.0)
                .chargeableWeightKg(Math.round(chargeableKg * 100.0) / 100.0)
                .codAmount(codAmount)
                .plans(plans)
                .build();
    }

    private PlanDetail buildPlan(String serviceCode,
                                 String serviceName,
                                 String estimatedDelivery,
                                 double baseCost,
                                 double costPerKg,
                                 double chargeableKg,
                                 BigDecimal codFee,
                                 BigDecimal insuranceFee) {
        double extraWeight = Math.max(0.0, chargeableKg - 0.5);
        BigDecimal baseFee = BigDecimal.valueOf(baseCost + (extraWeight * costPerKg)).setScale(0, RoundingMode.HALF_UP);
        BigDecimal fuelSurcharge = baseFee.multiply(FUEL_SURCHARGE_RATE).setScale(0, RoundingMode.HALF_UP);
        BigDecimal totalFee = baseFee.add(fuelSurcharge).add(codFee).add(insuranceFee).setScale(0, RoundingMode.HALF_UP);

        return PlanDetail.builder()
                .serviceCode(serviceCode)
                .serviceName(serviceName)
                .estimatedDelivery(estimatedDelivery)
                .baseFee(baseFee)
                .fuelSurcharge(fuelSurcharge)
                .codFee(codFee)
                .insuranceFee(insuranceFee)
                .totalFee(totalFee)
                .build();
    }
}
