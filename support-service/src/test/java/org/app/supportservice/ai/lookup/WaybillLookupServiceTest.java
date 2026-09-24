package org.app.supportservice.ai.lookup;

import feign.FeignException;
import feign.Request;
import feign.Response;
import org.app.supportservice.ai.client.ShipmentAiClient;
import org.app.supportservice.ai.client.TrackingAiClient;
import org.app.supportservice.ai.dto.response.TrackingEventView;
import org.app.supportservice.ai.dto.response.TrackingStatusView;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WaybillLookupServiceTest {

    @Mock
    private TrackingAiClient trackingAiClient;

    @Mock
    private ShipmentAiClient shipmentAiClient;

    @InjectMocks
    private WaybillLookupService waybillLookupService;

    @Test
    void missingWaybillDoesNotInventCourier() {
        FeignException trackingMissing = httpError(404, "SHIPMENT_NOT_FOUND");
        FeignException shipmentMissing = httpError(400, "Không tìm thấy đơn hàng: WB-MISSING");
        when(trackingAiClient.getCurrentStatus("WB-MISSING")).thenThrow(trackingMissing);
        when(shipmentAiClient.getByCode("WB-MISSING")).thenThrow(shipmentMissing);

        String text = waybillLookupService.describe("wb-missing");

        assertTrue(text.contains("Không tìm thấy vận đơn WB-MISSING"));
        assertFalse(text.contains("0987654321"));
        assertFalse(text.contains("Nguyễn Văn A"));
        assertFalse(text.contains("Cầu Giấy"));
        assertFalse(text.contains("17:30"));
    }

    @Test
    void returningStatusComesFromTracking() {
        TrackingStatusView status = new TrackingStatusView();
        status.setCurrentStatus("RETURNING");
        status.setLocationCode("HUB_HN");
        when(trackingAiClient.getCurrentStatus("WB1")).thenReturn(status);

        TrackingEventView event = new TrackingEventView();
        event.setStatus("RETURNING");
        event.setLocationCode("HUB_HN");
        event.setNode("Bàn giao hoàn");
        event.setOccurredAt(LocalDateTime.of(2026, 9, 23, 14, 20));
        when(trackingAiClient.getHistory("WB1")).thenReturn(List.of(event));
        FeignException shipmentMissing = httpError(400, "Không tìm thấy đơn hàng: WB1");
        when(shipmentAiClient.getByCode("WB1")).thenThrow(shipmentMissing);

        String text = waybillLookupService.describe("WB1");

        assertTrue(text.contains("Đang hoàn"));
        assertTrue(text.contains("RETURNING"));
        assertTrue(text.contains("HUB_HN"));
        assertTrue(text.contains("Bàn giao hoàn"));
        assertTrue(text.contains("14:20 23/09/2026"));
        assertFalse(text.contains("0987654321"));
    }

    @Test
    void downstreamFailureDoesNotClaimMissing() {
        FeignException trackingDown = httpError(503, "down");
        FeignException shipmentDown = httpError(503, "down");
        when(trackingAiClient.getCurrentStatus("WB2")).thenThrow(trackingDown);
        when(shipmentAiClient.getByCode("WB2")).thenThrow(shipmentDown);

        String text = waybillLookupService.describe("WB2");

        assertTrue(text.contains("đang bận"));
        assertFalse(text.contains("Không tìm thấy"));
    }

    @Test
    void shipmentMissingDetector() {
        assertTrue(WaybillLookupService.shipmentMissing(404, null));
        assertTrue(WaybillLookupService.shipmentMissing(400, "Không tìm thấy đơn hàng: WB1"));
        assertFalse(WaybillLookupService.shipmentMissing(400, "Thiếu tham số"));
    }

    private static FeignException httpError(int status, String body) {
        Request request = Request.create(
                Request.HttpMethod.GET,
                "http://localhost/api",
                Map.of(),
                null,
                StandardCharsets.UTF_8);
        return FeignException.errorStatus(
                "client#call",
                Response.builder()
                        .status(status)
                        .reason("error")
                        .request(request)
                        .headers(Map.of())
                        .body(body, StandardCharsets.UTF_8)
                        .build());
    }
}
