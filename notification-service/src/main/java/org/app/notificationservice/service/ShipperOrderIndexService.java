package org.app.notificationservice.service;

import java.util.Set;

public interface ShipperOrderIndexService {

    void addOrder(String courierCode, String trackingCode);

    void removeOrder(String courierCode, String trackingCode);

    void removeOrderByTrackingCode(String trackingCode);

    void addCodPending(String courierCode, String trackingCode);

    void removeCodPendingByTrackingCode(String trackingCode);

    void moveToCodPending(String trackingCode);

    boolean isAssignedTo(String courierCode, String trackingCode);

    Set<String> getOrders(String courierCode);

    Set<String> getCodPending(String courierCode);
}