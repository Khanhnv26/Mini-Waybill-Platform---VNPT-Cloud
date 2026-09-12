package org.app.routingservice.controller;

import lombok.RequiredArgsConstructor;
import org.app.routingservice.dto.trip.SchedulerConfigRequest;
import org.app.routingservice.dto.trip.SchedulerConfigResponse;
import org.app.routingservice.entity.SchedulerConfig;
import org.app.routingservice.repository.SchedulerConfigRepository;
import org.app.routingservice.scheduler.TripConsolidationScheduler;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/routing/scheduler")
@RequiredArgsConstructor
public class SchedulerController {

    private final SchedulerConfigRepository schedulerConfigRepository;

    @Autowired(required = false)
    private TripConsolidationScheduler scheduler;

    @GetMapping("/config")
    public ResponseEntity<SchedulerConfigResponse> getConfig() {
        SchedulerConfig config = getOrCreateConfig();
        return ResponseEntity.ok(SchedulerConfigResponse.builder()
                .enabled(config.getEnabled() != null ? config.getEnabled() : true)
                .intervalSeconds(config.getIntervalSeconds() != null ? config.getIntervalSeconds() : 300L)
                .fixedCronTimes(config.getFixedCronTimes() != null ? config.getFixedCronTimes() : "08:00,12:00,18:00,22:00")
                .readyThresholdPercent(config.getReadyThresholdPercent() != null ? config.getReadyThresholdPercent() : 80.0)
                .cutoffBufferMinutes(config.getCutoffBufferMinutes() != null ? config.getCutoffBufferMinutes() : 30)
                .lastRunTime(config.getLastRunTime())
                .lastConsolidatedCount(config.getLastConsolidatedCount() != null ? config.getLastConsolidatedCount() : 0)
                .build());
    }

    @PostMapping("/config")
    public ResponseEntity<SchedulerConfigResponse> updateConfig(@RequestBody SchedulerConfigRequest request) {
        SchedulerConfig config = getOrCreateConfig();
        if (request.getEnabled() != null) {
            config.setEnabled(request.getEnabled());
            if (scheduler != null) scheduler.setEnabled(request.getEnabled());
        }
        if (request.getIntervalSeconds() != null && request.getIntervalSeconds() > 0) {
            config.setIntervalSeconds(request.getIntervalSeconds());
            if (scheduler != null) scheduler.setIntervalSeconds(request.getIntervalSeconds());
        }
        if (request.getFixedCronTimes() != null && !request.getFixedCronTimes().isBlank()) {
            config.setFixedCronTimes(request.getFixedCronTimes().trim());
        }
        if (request.getReadyThresholdPercent() != null && request.getReadyThresholdPercent() > 0) {
            config.setReadyThresholdPercent(request.getReadyThresholdPercent());
        }
        if (request.getCutoffBufferMinutes() != null && request.getCutoffBufferMinutes() > 0) {
            config.setCutoffBufferMinutes(request.getCutoffBufferMinutes());
        }
        config.setUpdatedAt(LocalDateTime.now());
        schedulerConfigRepository.save(config);
        return getConfig();
    }

    private SchedulerConfig getOrCreateConfig() {
        return schedulerConfigRepository.findAll().stream().findFirst().orElseGet(() -> {
            SchedulerConfig init = SchedulerConfig.builder()
                    .enabled(true)
                    .intervalSeconds(300L)
                    .fixedCronTimes("08:00,12:00,18:00,22:00")
                    .readyThresholdPercent(80.0)
                    .cutoffBufferMinutes(30)
                    .lastConsolidatedCount(0)
                    .build();
            return schedulerConfigRepository.save(init);
        });
    }
}
