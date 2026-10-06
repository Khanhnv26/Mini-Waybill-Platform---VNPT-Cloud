package org.app.notificationservice.service;

import org.app.notificationservice.dto.response.PaymentResponse;
import org.app.notificationservice.dto.response.ReturnRequestResponse;
import org.app.notificationservice.dto.response.ShipmentDetailResponse;
import org.app.notificationservice.dto.response.ShipperForecastResponse;
import org.app.notificationservice.dto.response.ShipperLookupResponse;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

public interface ShipperBotService {

    ShipperLookupResponse resolveShipper(String telegramChatId);

    List<ShipmentDetailResponse> getActiveOrders(String courierCode);

    List<ShipmentDetailResponse> getOrders(String courierCode, String filter);

    List<ShipmentDetailResponse> getDeliveredToday(String courierCode);

    Map<String, List<ShipmentDetailResponse>> getCodGroups(String courierCode);

    List<ShipmentDetailResponse> getPendingCodOrders(String courierCode);

    ShipmentDetailResponse getOrder(String trackingCode);

    ReturnRequestResponse getReturnRequest(String trackingCode);

    boolean isOrderOwnedBy(String courierCode, String trackingCode);

    ShipmentDetailResponse markDelivered(String courierCode, String trackingCode);

    ShipmentDetailResponse markDeliveryFailed(String courierCode, String trackingCode, String reasonCode);

    ShipmentDetailResponse retryDelivery(String courierCode, String trackingCode);

    ShipmentDetailResponse acceptReturn(String courierCode, String trackingCode);

    ShipmentDetailResponse confirmReturned(String courierCode, String trackingCode, boolean viaQr);

    PaymentResponse createCodQr(String courierCode, String trackingCode);

    PaymentResponse createReturnQr(String courierCode, String trackingCode);

    PaymentResponse getPayment(String trackingCode);

    void mockPay(String trackingCode);

    BigDecimal calculateReturnFee(ShipmentDetailResponse shipment);

    int submitCod(String courierCode, List<String> trackingCodes);

    ShipperLookupResponse toggleShift(String courierCode);

    ShipperForecastResponse getForecast(String courierCode);
}