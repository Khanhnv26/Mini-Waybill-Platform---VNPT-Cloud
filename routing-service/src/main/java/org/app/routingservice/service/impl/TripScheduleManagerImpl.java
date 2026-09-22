package org.app.routingservice.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.app.routingservice.dto.trip.SchedulerConfigRequest;
import org.app.routingservice.dto.trip.SchedulerConfigResponse;
import org.app.routingservice.entity.SchedulerConfig;
import org.app.routingservice.repository.SchedulerConfigRepository;
import org.app.routingservice.scheduler.TripConsolidationJob;
import org.app.routingservice.service.TripScheduleManager;
import org.quartz.*;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class TripScheduleManagerImpl implements TripScheduleManager {

    private final Scheduler scheduler;
    private final SchedulerConfigRepository schedulerConfigRepository;
    private static final String JOB_NAME = "tripConsolidationJob";
    private static final String TRIGGER_NAME = "tripConsolidationTrigger";
    private static final String GROUP_NAME = "routingJobs";

    @Override
    @EventListener(ApplicationReadyEvent.class)
    public void initScheduler() {
        try {
            JobKey jobKey = JobKey.jobKey(JOB_NAME, GROUP_NAME);
            if (!scheduler.checkExists(jobKey)) {
                SchedulerConfig config = getOrCreateConfig();
                long intervalSeconds = (config.getIntervalSeconds() != null) ? config.getIntervalSeconds() : 300L;
                boolean isEnabled = Boolean.TRUE.equals(config.getEnabled());

                JobDetail jobDetail = JobBuilder.newJob(TripConsolidationJob.class)
                        .withIdentity(jobKey)
                        .storeDurably()
                        .build();

                Trigger trigger = TriggerBuilder.newTrigger()
                        .forJob(jobDetail)
                        .withIdentity(TRIGGER_NAME, GROUP_NAME)
                        .withSchedule(SimpleScheduleBuilder.simpleSchedule()
                                .withIntervalInSeconds((int) intervalSeconds)
                                .repeatForever())
                        .build();

                scheduler.scheduleJob(jobDetail, trigger);

                log.info("[QUARTZ] Khởi tạo TripConsolidationJob thành công! Chu kỳ: {}s", intervalSeconds);

                if (!isEnabled) {
                    scheduler.pauseJob(jobKey);
                    log.info("[QUARTZ] TripConsolidationJob đang ở chế độ THỦ CÔNG. Job đã bị tạm dừng.");
                }
            }
        } catch (SchedulerException e) {
            log.error("[QUARTZ] Lỗi khởi tạo scheduler: {}", e.getMessage(), e);
            throw new RuntimeException("Lỗi khởi tạo Quartz Scheduler", e);
        }
    }

    @Override
    public SchedulerConfigResponse getConfig() {
        SchedulerConfig config = getOrCreateConfig();
        return mapToResponse(config);
    }

    @Override
    @Transactional
    public SchedulerConfigResponse updateConfig(SchedulerConfigRequest request) {
        SchedulerConfig config = getOrCreateConfig();

        if (request.getEnabled() != null) {
            config.setEnabled(request.getEnabled());
        }

        boolean intervalChanged = false;
        if (request.getIntervalSeconds() != null && request.getIntervalSeconds() > 0) {
            config.setIntervalSeconds(request.getIntervalSeconds());
            intervalChanged = true;
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

        if (intervalChanged) {
            rescheduleQuartzJob(config.getIntervalSeconds());
        }
        // Quartz rescheduleJob lưu trigger mới ở WAITING, nên pause/resume phải đi sau.
        toggleQuartzJob(Boolean.TRUE.equals(config.getEnabled()));

        return mapToResponse(config);
    }

    private void rescheduleQuartzJob(long intervalSeconds) {
        try {
            TriggerKey triggerKey = TriggerKey.triggerKey(TRIGGER_NAME, GROUP_NAME);
            Trigger newTrigger = TriggerBuilder.newTrigger()
                    .withIdentity(triggerKey)
                    .withSchedule(SimpleScheduleBuilder.simpleSchedule()
                            .withIntervalInSeconds((int) intervalSeconds)
                            .repeatForever())
                    .build();
            scheduler.rescheduleJob(triggerKey, newTrigger);
            log.info("[QUARTZ] Đã cập nhật lại chu kỳ chạy thành: {} giây", intervalSeconds);
        } catch (SchedulerException e) {
            log.error("[QUARTZ] Lỗi đổi lịch Quartz: {}", e.getMessage(), e);
            throw new RuntimeException("Không thể cập nhật lịch Quartz", e);
        }
    }

    private void toggleQuartzJob(boolean enabled) {
        try {
            JobKey jobKey = JobKey.jobKey(JOB_NAME, GROUP_NAME);
            if (enabled) {
                scheduler.resumeJob(jobKey);
                log.info("[QUARTZ] TripConsolidationJob đã được kích hoạt lại.");
            } else {
                scheduler.pauseJob(jobKey);
                log.info("[QUARTZ] TripConsolidationJob đã bị tạm dừng.");
            }
        } catch (SchedulerException e) {
            log.error("[QUARTZ] Lỗi bật/tắt Quartz: {}", e.getMessage(), e);
            throw new RuntimeException("Không thể bật/tắt Quartz Job", e);
        }
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

    private SchedulerConfigResponse mapToResponse(SchedulerConfig config) {
        return SchedulerConfigResponse.builder()
                .enabled(config.getEnabled() != null ? config.getEnabled() : true)
                .intervalSeconds(config.getIntervalSeconds() != null ? config.getIntervalSeconds() : 300L)
                .fixedCronTimes(config.getFixedCronTimes() != null ? config.getFixedCronTimes() : "08:00,12:00,18:00,22:00")
                .readyThresholdPercent(config.getReadyThresholdPercent() != null ? config.getReadyThresholdPercent() : 80.0)
                .cutoffBufferMinutes(config.getCutoffBufferMinutes() != null ? config.getCutoffBufferMinutes() : 30)
                .lastRunTime(config.getLastRunTime())
                .lastConsolidatedCount(config.getLastConsolidatedCount() != null ? config.getLastConsolidatedCount() : 0)
                .build();
    }
}
