package org.app.shipmentservice.service;

import org.app.shipmentservice.entity.Shipment;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;

class ReturnFeeCalculatorTest {

    private final ReturnFeeCalculator calculator = new ReturnFeeCalculator();

    @Test
    @DisplayName("Lỗi bưu chính (postalFault = true) luôn được miễn cước hoàn (0đ)")
    void testPostalFaultIsFree() {
        Shipment shipment = Shipment.builder()
                .shippingFee(BigDecimal.valueOf(50000))
                .build();
        BigDecimal fee = calculator.calculateReturnFee(shipment, true);
        assertEquals(BigDecimal.ZERO, fee);
    }

    @Test
    @DisplayName("Cước hoàn tính đúng 50% cước gốc của vận đơn")
    void testStandardReturnFee50Percent() {
        Shipment shipment = Shipment.builder()
                .shippingFee(BigDecimal.valueOf(35000))
                .build();
        BigDecimal fee = calculator.calculateReturnFee(shipment, false);
        assertEquals(BigDecimal.valueOf(17500), fee);
    }

    @Test
    @DisplayName("Cước hoàn làm tròn HALF_UP đúng quy định kế toán")
    void testReturnFeeRounding() {
        Shipment shipment = Shipment.builder()
                .shippingFee(BigDecimal.valueOf(35555))
                .build();
        // 35555 * 0.5 = 17777.5 -> 17778
        BigDecimal fee = calculator.calculateReturnFee(shipment, false);
        assertEquals(BigDecimal.valueOf(17778), fee);
    }

    @Test
    @DisplayName("Nếu đơn hàng không có cước gốc (null), fallback về phí mặc định 35.000đ x 50% = 17.500đ")
    void testFallbackFeeWhenNull() {
        Shipment shipment = Shipment.builder()
                .shippingFee(null)
                .totalFee(null)
                .build();
        BigDecimal fee = calculator.calculateReturnFee(shipment, false);
        assertEquals(BigDecimal.valueOf(17500), fee);
    }
}
