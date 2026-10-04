package org.app.notificationservice.service;

import java.util.Map;
import java.util.Set;

public interface ShipperOrderIndexService {

    void addOrder(String courierCode, String trackingCode);

    void removeOrder(String courierCode, String trackingCode);

    void removeOrderByTrackingCode(String trackingCode);

    void addCodPending(String courierCode, String trackingCode);

    void removeCodPendingByTrackingCode(String trackingCode);

    void moveToCodPending(String trackingCode);

    void applySettlementStatus(String trackingCode, String settlementStatus);

    void markDeliveredToday(String courierCode, String trackingCode);

    boolean isAssignedTo(String courierCode, String trackingCode);

    Set<String> getOrders(String courierCode);

    Set<String> getCodPending(String courierCode);

    Set<String> getCodSent(String courierCode);

    Set<String> getCodSettled(String courierCode);

    Set<String> getDeliveredToday(String courierCode);

    void registerPaymentWatch(String trackingCode, String chatId, Integer messageId,
                              String courierCode, String type, String amount);

    Map<String, String> getPaymentWatch(String trackingCode);

    void clearPaymentWatch(String trackingCode);

    Set<String> getPaymentWatchCodes();
}