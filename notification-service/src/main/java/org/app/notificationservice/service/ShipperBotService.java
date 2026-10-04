package org.app.notificationservice.service;

import org.app.notificationservice.dto.response.ShipmentDetailResponse;
import org.app.notificationservice.dto.response.ShipperForecastResponse;
import org.app.notificationservice.dto.response.ShipperLookupResponse;

import java.util.List;

public interface ShipperBotService {

    ShipperLookupResponse resolveShipper(String telegramChatId);

    List<ShipmentDetailResponse> getActiveOrders(String courierCode);

    List<ShipmentDetailResponse> getPendingCodOrders(String courierCode);

    ShipmentDetailResponse getOrder(String trackingCode);

    boolean isOrderOwnedBy(String courierCode, String trackingCode);

    ShipmentDetailResponse markDelivered(String courierCode, String trackingCode);

    ShipmentDetailResponse markDeliveryFailed(String courierCode, String trackingCode, String reasonCode);

    int submitCod(String courierCode, List<String> trackingCodes);

    ShipperLookupResponse toggleShift(String courierCode);

    ShipperForecastResponse getForecast(String courierCode);
}