package org.app.supportservice.ai.lookup;

import feign.FeignException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.app.supportservice.ai.client.PricingAiClient;
import org.app.supportservice.ai.dto.request.TariffQuoteRequest;
import org.app.supportservice.ai.dto.response.TariffQuoteResponse;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.NumberFormat;
import java.util.Locale;

@Slf4j
@Service
@RequiredArgsConstructor
public class TariffLookupService {

    private final PricingAiClient pricingAiClient;

    public String quote(double weightKg, String senderProvince, String receiverProvince, String serviceType) {
        if (Double.isNaN(weightKg) || weightKg <= 0) {
            return "Cần khối lượng lớn hơn 0 kg để tính cước. Không nêu số tiền khi thiếu khối lượng.";
        }
        if (senderProvince == null || senderProvince.isBlank() || receiverProvince == null || receiverProvince.isBlank()) {
            return "Cần tỉnh/thành người gửi và tỉnh/thành người nhận để tính cước theo bảng giá hệ thống. Không ước tính số tiền khi thiếu tuyến.";
        }

        TariffQuoteRequest request = TariffQuoteRequest.builder()
                .senderProvince(senderProvince.trim())
                .receiverProvince(receiverProvince.trim())
                .weightGram(weightKg * 1000.0)
                .build();

        TariffQuoteResponse quote;
        try {
            quote = pricingAiClient.calculate(request);
        } catch (FeignException ex) {
            log.warn("[AI Tool] Pricing lỗi HTTP {}", ex.status());
            return "Hệ thống tính cước đang bận hoặc từ chối tuyến này. Không nêu số tiền ước tính.";
        } catch (Exception ex) {
            log.warn("[AI Tool] Pricing không gọi được: {}", ex.getMessage());
            return "Hệ thống tính cước đang bận. Không nêu số tiền ước tính.";
        }

        if (quote == null || quote.getPlans() == null || quote.getPlans().isEmpty()) {
            return "Hệ thống tính cước không trả về bảng giá. Không nêu số tiền ước tính.";
        }

        String asked = normalizeService(serviceType);
        StringBuilder text = new StringBuilder();
        text.append("Cước chính thức");
        if (quote.getRouteDescription() != null && !quote.getRouteDescription().isBlank()) {
            text.append(" tuyến ").append(quote.getRouteDescription().trim());
        } else {
            text.append(" từ ").append(request.getSenderProvince()).append(" đến ").append(request.getReceiverProvince());
        }
        if (quote.getChargeableWeightKg() != null) {
            text.append(", khối lượng tính cước ")
                    .append(BigDecimal.valueOf(quote.getChargeableWeightKg()).setScale(2, RoundingMode.HALF_UP).toPlainString())
                    .append(" kg");
        }
        text.append(":\n");
        if (asked != null) {
            text.append("Gói khách hỏi: ").append(asked).append('\n');
        }

        for (TariffQuoteResponse.PlanDetail plan : quote.getPlans()) {
            text.append("- ")
                    .append(plan.getServiceName() == null ? plan.getServiceCode() : plan.getServiceName());
            if (plan.getServiceCode() != null) {
                text.append(" (").append(plan.getServiceCode()).append(')');
            }
            text.append(": tổng ").append(vnd(plan.getTotalFee()));
            if (plan.getEstimatedDelivery() != null && !plan.getEstimatedDelivery().isBlank()) {
                text.append(", dự kiến ").append(plan.getEstimatedDelivery().trim());
            }
            if (plan.getBaseFee() != null || plan.getFuelSurcharge() != null) {
                text.append(". Gồm cước ").append(vnd(plan.getBaseFee()))
                        .append(" và phụ phí nhiên liệu ").append(vnd(plan.getFuelSurcharge()));
            }
            text.append('\n');
        }
        text.append("Chỉ báo các số tiền trên. Không cộng thêm hay làm tròn khác.");
        return text.toString();
    }

    static String normalizeService(String serviceType) {
        if (serviceType == null || serviceType.isBlank()) {
            return null;
        }
        String value = serviceType.trim().toUpperCase(Locale.ROOT);
        return switch (value) {
            case "ECO", "ECONOMY", "TIẾT KIỆM" -> "ECO";
            case "STANDARD", "TIÊU CHUẨN" -> "STANDARD";
            case "EXPRESS", "HỎA TỐC" -> "EXPRESS";
            default -> value;
        };
    }

    static String vnd(BigDecimal amount) {
        if (amount == null) {
            return "0 đ";
        }
        NumberFormat format = NumberFormat.getIntegerInstance(Locale.forLanguageTag("vi-VN"));
        return format.format(amount) + " đ";
    }
}
