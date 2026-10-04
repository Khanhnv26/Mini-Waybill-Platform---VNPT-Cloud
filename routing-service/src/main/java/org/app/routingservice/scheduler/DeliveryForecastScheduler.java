package org.app.routingservice.scheduler;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.app.routingservice.service.DeliveryForecastService;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class DeliveryForecastScheduler {

    private final DeliveryForecastService deliveryForecastService;

    @Scheduled(cron = "${logistics.forecast.cron:0 0 20 * * ?}")
    public void runDailyDeliveryForecastDispatch() {
        log.info("[SCHEDULED-JOB] Khởi chạy tiến trình tự động chốt dự báo sản lượng ca phát ngày mai lúc 20:00...");
        try {
            deliveryForecastService.dispatchAllStationsDailyForecast();
            log.info("[SCHEDULED-JOB] Hoàn thành chốt và gửi tin Telegram dự báo ca phát ngày mai cho toàn bộ Bưu Cục.");
        } catch (Exception e) {
            log.error("[SCHEDULED-JOB] Thất bại khi gửi dự báo sản lượng tự động: {}", e.getMessage(), e);
        }
    }
}
