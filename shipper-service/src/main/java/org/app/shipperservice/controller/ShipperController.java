package org.app.shipperservice.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.app.shipperservice.dto.request.CreateShipperRequest;
import org.app.shipperservice.dto.request.LinkTelegramRequest;
import org.app.shipperservice.dto.request.UpdateShipperRequest;
import org.app.shipperservice.dto.response.ShipperLookupResponse;
import org.app.shipperservice.dto.response.ShipperResponse;
import org.app.shipperservice.service.ShipperService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/shippers")
@RequiredArgsConstructor
public class ShipperController {
    private final ShipperService shipperService;

    @PostMapping
    public ResponseEntity<ShipperResponse> createShipper(
            @Valid @RequestBody CreateShipperRequest createShipperRequest) {
        return ResponseEntity.status(HttpStatus.CREATED).body(shipperService.createShipper(createShipperRequest));
    }

    @GetMapping
    public ResponseEntity<List<ShipperResponse>> getAllShippers() {
        return ResponseEntity.ok(shipperService.getAllShippers());
    }

    @PutMapping("/{id}")
    public ResponseEntity<ShipperResponse> updateShipper(
            @PathVariable Long id,
            @Valid @RequestBody UpdateShipperRequest updateShipperRequest) {
        return ResponseEntity.ok(shipperService.updateShipper(id, updateShipperRequest));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ShipperResponse> deleteShipper(@PathVariable Long id) {
        return ResponseEntity.ok(shipperService.deleteShipper(id));
    }

    @GetMapping("/internal/by-courier/{courierCode}")
    public ResponseEntity<ShipperLookupResponse> findByCourierCode(@PathVariable String courierCode) {
        return ResponseEntity.ok(shipperService.findByCourierCode(courierCode));
    }

    @PostMapping("/internal/link-telegram")
    public ResponseEntity<Map<String, Object>> linkTelegram(@RequestBody LinkTelegramRequest linkTelegramRequest) {
        boolean success = shipperService.linkTelegramChatId(linkTelegramRequest.getCourierCode(), linkTelegramRequest.getTelegramChatId());
        return ResponseEntity.ok(Map.of(
                "success", success,
                "message", success ? "Liên kết Telegram thành công" : "Không tìm thấy mã bưu tá"
        ));
    }
}
