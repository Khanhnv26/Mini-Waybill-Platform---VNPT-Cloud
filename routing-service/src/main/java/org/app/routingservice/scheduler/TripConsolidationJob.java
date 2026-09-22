package org.app.routingservice.scheduler;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.app.routingservice.entity.SchedulerConfig;
import org.app.routingservice.repository.SchedulerConfigRepository;
import org.app.routingservice.service.TripService;
import org.quartz.DisallowConcurrentExecution;
import org.quartz.JobExecutionContext;
import org.quartz.JobExecutionException;
import org.springframework.scheduling.quartz.QuartzJobBean;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Component
@RequiredArgsConstructor
@DisallowConcurrentExecution
@Slf4j
public class TripConsolidationJob extends QuartzJobBean {

    private final TripService tripService;
    private final SchedulerConfigRepository schedulerConfigRepository;


    @Override
    protected void executeInternal(JobExecutionContext context) throws JobExecutionException {
        SchedulerConfig config = schedulerConfigRepository.findAll().stream().findFirst().orElse(null);
        if (config == null || !Boolean.TRUE.equals(config.getEnabled())) {
            log.info("[QUARTZ-JOB] Bộ lập lịch đang tắt. Bỏ qua chu kỳ gom đơn.");
            return;
        }

        log.info("[QUARTZ-JOB] >>> Bắt đầu tiến trình tự động gom đơn lên các chuyến xe chờ...");
        try {
            int consolidatedCount = tripService.consolidateAllScheduledTrips();
            config.setLastRunTime(LocalDateTime.now());
            config.setLastConsolidatedCount(consolidatedCount);
            schedulerConfigRepository.save(config);
            log.info("[QUARTZ-JOB] <<< Hoàn tất chu kỳ gom đơn. Đã thêm tổng cộng {} kiện hàng.", consolidatedCount);
        } catch (Exception e) {
            log.error("[QUARTZ-JOB] <<< Lỗi xảy ra trong quá trình gom đơn: {}", e.getMessage(), e);
            throw new JobExecutionException(e);
        }
    }
}
