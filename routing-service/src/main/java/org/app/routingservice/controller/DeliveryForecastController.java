package org.app.routingservice.controller;

import lombok.RequiredArgsConstructor;
import org.app.routingservice.dto.forecast.ShipperForecastDto;
import org.app.routingservice.dto.forecast.StationDeliveryForecastResponse;
import org.app.routingservice.dto.forecast.TelegramDispatchResult;
import org.app.routingservice.service.DeliveryForecastService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/routing/forecast")
@RequiredArgsConstructor
public class DeliveryForecastController {

    private final DeliveryForecastService deliveryForecastService;

    @GetMapping("/station/{stationCode}")
    public ResponseEntity<StationDeliveryForecastResponse> getStationForecast(
            @PathVariable String stationCode,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(deliveryForecastService.getStationForecast(stationCode, date));
    }

    @GetMapping("/shipper/{courierCode}")
    public ResponseEntity<ShipperForecastDto> getShipperForecast(
            @PathVariable String courierCode,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(deliveryForecastService.getShipperForecast(courierCode, date));
    }

    @PostMapping("/station/{stationCode}/dispatch-telegram")
    public ResponseEntity<TelegramDispatchResult> dispatchStationTelegram(
            @PathVariable String stationCode,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(deliveryForecastService.dispatchTelegramForecast(stationCode, date));
    }
}
