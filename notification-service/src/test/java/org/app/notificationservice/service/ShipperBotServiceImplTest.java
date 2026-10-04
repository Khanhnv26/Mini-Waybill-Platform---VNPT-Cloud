package org.app.notificationservice.service;

import org.app.notificationservice.client.ForecastClient;
import org.app.notificationservice.client.PaymentClient;
import org.app.notificationservice.client.ShipmentClient;
import org.app.notificationservice.client.ShipperClient;
import org.app.notificationservice.client.TrackingClient;
import org.app.notificationservice.dto.response.ShipmentDetailResponse;
import org.app.notificationservice.dto.response.ShipperLookupResponse;
import org.app.notificationservice.service.impl.ShipperBotServiceImpl;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ShipperBotServiceImplTest {

    @Mock
    private ShipperClient shipperClient;

    @Mock
    private ShipmentClient shipmentClient;

    @Mock
    private TrackingClient trackingClient;

    @Mock
    private ForecastClient forecastClient;

    @Mock
    private PaymentClient paymentClient;

    @Mock
    private ShipperOrderIndexService shipperOrderIndexService;

    @InjectMocks
    private ShipperBotServiceImpl service;

    @Test
    @DisplayName("Cước hoàn = 50% phí vận chuyển gốc")
    void calculateReturnFee_halfOfShippingFee() {
        ShipmentDetailResponse shipment = ShipmentDetailResponse.builder()
                .shippingFee(BigDecimal.valueOf(40000))
                .build();
        assertEquals(BigDecimal.valueOf(20000), service.calculateReturnFee(shipment));
    }

    @Test
    @DisplayName("Cước hoàn mặc định khi thiếu phí")
    void calculateReturnFee_defaultWhenMissing() {
        ShipmentDetailResponse shipment = ShipmentDetailResponse.builder().build();
        assertEquals(BigDecimal.valueOf(17500), service.calculateReturnFee(shipment));
    }

    @Test
    @DisplayName("Lọc đơn hoàn chỉ trả về RETURNING/OUT_FOR_RETURN")
    void getOrders_filterReturn() {
        when(shipperOrderIndexService.getOrders("BT-01")).thenReturn(Set.of("WB1", "WB2", "WB3", "WB4"));
        when(shipmentClient.getShipmentByCode("WB1")).thenReturn(shipment("WB1", "RETURNING"));
        when(shipmentClient.getShipmentByCode("WB2")).thenReturn(shipment("WB2", "OUT_FOR_RETURN"));
        when(shipmentClient.getShipmentByCode("WB3")).thenReturn(shipment("WB3", "OUT_FOR_DELIVERY"));
        when(shipmentClient.getShipmentByCode("WB4")).thenReturn(shipment("WB4", "DELIVERED"));

        List<ShipmentDetailResponse> result = service.getOrders("BT-01", "RETURN");

        assertEquals(2, result.size());
        verify(shipperOrderIndexService).removeOrder("BT-01", "WB4");
    }

    @Test
    @DisplayName("Giao COD tiền mặt: đánh dấu đã giao hôm nay và vào quỹ chờ nộp")
    void markDelivered_withCod() {
        when(shipperClient.findByCourierCode("BT-01")).thenReturn(ShipperLookupResponse.builder()
                .courierCode("BT-01").stationCode("POST-HN-CG").found(true).build());
        when(shipmentClient.getShipmentByCode("WB1")).thenReturn(
                ShipmentDetailResponse.builder()
                        .trackingCode("WB1")
                        .currentStatus("OUT_FOR_DELIVERY")
                        .codAmount(BigDecimal.valueOf(150000))
                        .build());
        when(trackingClient.updateStatus(eq("WB1"), anyMap(), eq("ROLE_SHIPPER"))).thenReturn(Map.of());

        service.markDelivered("BT-01", "WB1");

        verify(trackingClient).updateStatus(eq("WB1"), any(Map.class), eq("ROLE_SHIPPER"));
        verify(shipperOrderIndexService).markDeliveredToday("BT-01", "WB1");
        verify(shipperOrderIndexService).addCodPending("BT-01", "WB1");
    }

    private ShipmentDetailResponse shipment(String code, String status) {
        return ShipmentDetailResponse.builder()
                .trackingCode(code)
                .currentStatus(status)
                .codAmount(BigDecimal.ZERO)
                .build();
    }
}