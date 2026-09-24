package org.app.supportservice.ai.lookup;

import feign.FeignException;
import org.app.supportservice.ai.client.PricingAiClient;
import org.app.supportservice.ai.dto.request.TariffQuoteRequest;
import org.app.supportservice.ai.dto.response.TariffQuoteResponse;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TariffLookupServiceTest {

    @Mock
    private PricingAiClient pricingAiClient;

    @InjectMocks
    private TariffLookupService tariffLookupService;

    @Test
    void missingRouteDoesNotInventPrice() {
        String text = tariffLookupService.quote(1.0, "  ", "Hà Nội", "EXPRESS");

        assertTrue(text.contains("Không ước tính số tiền"));
        verify(pricingAiClient, never()).calculate(any());
    }

    @Test
    void quoteUsesPricingServiceTotal() {
        TariffQuoteResponse.PlanDetail plan = new TariffQuoteResponse.PlanDetail();
        plan.setServiceCode("EXPRESS");
        plan.setServiceName("VNPT Hỏa Tốc");
        plan.setEstimatedDelivery("12-24 giờ");
        plan.setBaseFee(new BigDecimal("55000"));
        plan.setFuelSurcharge(new BigDecimal("3300"));
        plan.setTotalFee(new BigDecimal("58300"));

        TariffQuoteResponse response = new TariffQuoteResponse();
        response.setRouteDescription("Hà Nội → Đà Nẵng • Liên Miền");
        response.setChargeableWeightKg(1.0);
        response.setPlans(List.of(plan));
        when(pricingAiClient.calculate(any())).thenReturn(response);

        String text = tariffLookupService.quote(1, "Hà Nội", "Đà Nẵng", "Hỏa tốc");

        ArgumentCaptor<TariffQuoteRequest> captor = ArgumentCaptor.forClass(TariffQuoteRequest.class);
        verify(pricingAiClient).calculate(captor.capture());
        assertEquals(1000.0, captor.getValue().getWeightGram());
        assertEquals("Hà Nội", captor.getValue().getSenderProvince());
        assertTrue(text.contains("Gói khách hỏi: EXPRESS"));
        assertTrue(text.contains("VNPT Hỏa Tốc"));
        assertTrue(text.contains(TariffLookupService.vnd(new BigDecimal("58300"))));
        assertTrue(text.contains("12-24 giờ"));
        assertFalse(text.contains("Chưa bao gồm VAT"));
        assertFalse(text.contains("16.500"));
        assertFalse(text.contains("45.000"));
    }

    @Test
    void pricingOutageDoesNotInventPrice() {
        FeignException exception = mock(FeignException.class);
        when(exception.status()).thenReturn(503);
        when(pricingAiClient.calculate(any())).thenThrow(exception);

        String text = tariffLookupService.quote(2, "Hà Nội", "Huế", null);

        assertTrue(text.contains("Không nêu số tiền ước tính"));
        assertFalse(text.contains("VNĐ"));
    }
}
