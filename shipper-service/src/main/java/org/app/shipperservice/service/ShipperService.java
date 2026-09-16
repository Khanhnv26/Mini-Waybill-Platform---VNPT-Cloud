package org.app.shipperservice.service;

import org.app.shipperservice.dto.request.CreateShipperRequest;
import org.app.shipperservice.dto.request.UpdateShipperRequest;
import org.app.shipperservice.dto.response.ShipperLookupResponse;
import org.app.shipperservice.dto.response.ShipperResponse;

import java.util.List;

public interface ShipperService {
    ShipperResponse createShipper(CreateShipperRequest createShipperRequest);
    List<ShipperResponse> getAllShippers();
    ShipperResponse updateShipper(Long id, UpdateShipperRequest updateShipperRequest);
    ShipperResponse deleteShipper(Long id);
    ShipperLookupResponse findByCourierCode(String courierCode);
    boolean linkTelegramChatId(String courierCode, String telegramChatId);
}
