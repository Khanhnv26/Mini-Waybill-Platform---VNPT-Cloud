package org.app.routingservice.scheduler;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.app.routingservice.entity.SchedulerConfig;
import org.app.routingservice.repository.SchedulerConfigRepository;
import org.app.routingservice.service.TripService;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
@ConditionalOnProperty(prefix = "routing.consolidation", name = "enabled", havingValue = "true", matchIfMissing = true)
public class TripConsolidationScheduler {

    private final TripService tripService;
    private final SchedulerConfigRepository schedulerConfigRepository;
    private volatile boolean enabled = true;
    private volatile long intervalSeconds = 300;
    private LocalDateTime lastRunTime;
    private int lastConsolidatedCount = 0;

    @Scheduled(fixedDelay = 30000)
    public void scheduleConsolidation() {
        SchedulerConfig config = schedulerConfigRepository.findAll().stream().findFirst().orElse(null);
        if (config != null) {
            this.enabled = config.getEnabled() != null ? config.getEnabled() : true;
            this.intervalSeconds = config.getIntervalSeconds() != null ? config.getIntervalSeconds() : 300L;
        }

        if (!enabled) {
            log.debug("[TRIP-SCHEDULER] Tự động gom đơn đang ở chế độ THỦ CÔNG. Bỏ qua chu kỳ quét.");
            return;
        }

        LocalDateTime now = LocalDateTime.now();
        boolean shouldRun = false;

        if (lastRunTime == null || Duration.between(lastRunTime, now).getSeconds() >= intervalSeconds) {
            shouldRun = true;
        }

        if (!shouldRun && config != null && config.getFixedCronTimes() != null && !config.getFixedCronTimes().isBlank()) {
            String currentHourMinute = now.format(DateTimeFormatter.ofPattern("HH:mm"));
            List<String> fixedTimes = Arrays.stream(config.getFixedCronTimes().split(","))
                    .map(String::trim)
                    .toList();
            if (fixedTimes.contains(currentHourMinute)) {
                if (lastRunTime == null || Duration.between(lastRunTime, now).getSeconds() >= 60) {
                    shouldRun = true;
                }
            }
        }

        if (!shouldRun) {
            return;
        }

        log.info("[TRIP-SCHEDULER] Bắt đầu chu kỳ quét tự động gom đơn lên các chuyến xe chờ xuất bến...");
        try {
            int consolidatedCount = tripService.consolidateAllScheduledTrips();
            this.lastRunTime = now;
            this.lastConsolidatedCount = consolidatedCount;

            if (config != null) {
                config.setLastRunTime(now);
                config.setLastConsolidatedCount(consolidatedCount);
                schedulerConfigRepository.save(config);
            }

            log.info("[TRIP-SCHEDULER] Chu kỳ gom đơn hoàn tất: Tổng số kiện hàng được xếp lên xe là {}", consolidatedCount);
        } catch (Exception e) {
            log.error("[TRIP-SCHEDULER] Lỗi trong quá trình quét gom đơn tự động: {}", e.getMessage(), e);
        }
    }

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public long getIntervalSeconds() {
        return intervalSeconds;
    }

    public void setIntervalSeconds(long intervalSeconds) {
        this.intervalSeconds = intervalSeconds;
    }

    public LocalDateTime getLastRunTime() {
        return lastRunTime;
    }

    public int getLastConsolidatedCount() {
        return lastConsolidatedCount;
    }
}
