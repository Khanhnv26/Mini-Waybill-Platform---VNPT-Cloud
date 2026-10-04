package org.app.routingservice.service;

import org.app.routingservice.dto.forecast.ShipperForecastDto;
import org.app.routingservice.dto.forecast.StationDeliveryForecastResponse;
import org.app.routingservice.dto.forecast.TelegramDispatchResult;

import java.time.LocalDate;

public interface DeliveryForecastService {

    StationDeliveryForecastResponse getStationForecast(String stationCode, LocalDate targetDate);

    ShipperForecastDto getShipperForecast(String courierCode, LocalDate targetDate);

    TelegramDispatchResult dispatchTelegramForecast(String stationCode, LocalDate targetDate);

    void dispatchAllStationsDailyForecast();
}
