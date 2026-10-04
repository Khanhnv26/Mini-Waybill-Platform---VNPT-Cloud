package org.app.notificationservice.client;

import org.app.notificationservice.dto.response.ShipperLookupResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.Map;

@FeignClient(name = "shipper-service")
public interface ShipperClient {

    @GetMapping("/api/shippers/internal/by-courier/{courierCode}")
    ShipperLookupResponse findByCourierCode(@PathVariable("courierCode") String courierCode);

    @GetMapping("/api/shippers/internal/by-chat/{telegramChatId}")
    ShipperLookupResponse findByTelegramChatId(@PathVariable("telegramChatId") String telegramChatId);

    @PostMapping("/api/shippers/internal/link-telegram")
    Map<String, Object> linkTelegram(@RequestBody Map<String, String> request);

    @PatchMapping("/api/shippers/internal/{courierCode}/shift-status")
    Map<String, Object> updateShiftStatus(
            @PathVariable("courierCode") String courierCode,
            @RequestParam("shiftStatus") String shiftStatus);

    @PostMapping("/api/shippers/internal/{courierCode}/toggle-shift")
    ShipperLookupResponse toggleShift(@PathVariable("courierCode") String courierCode);
}
