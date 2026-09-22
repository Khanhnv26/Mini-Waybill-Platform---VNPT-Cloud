package org.app.routingservice.service;

import org.app.routingservice.dto.trip.SchedulerConfigRequest;
import org.app.routingservice.dto.trip.SchedulerConfigResponse;
import org.app.routingservice.entity.SchedulerConfig;
import org.app.routingservice.repository.SchedulerConfigRepository;
import org.app.routingservice.service.impl.TripScheduleManagerImpl;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.quartz.JobKey;
import org.quartz.Scheduler;
import org.quartz.Trigger;
import org.quartz.TriggerKey;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TripScheduleManagerImplTest {

    @Mock
    private Scheduler scheduler;

    @Mock
    private SchedulerConfigRepository schedulerConfigRepository;

    @InjectMocks
    private TripScheduleManagerImpl manager;

    @Test
    @DisplayName("Tắt lịch kèm đổi chu kỳ vẫn pause sau reschedule")
    void updateConfig_disableWithInterval_pausesAfterReschedule() throws Exception {
        SchedulerConfig config = SchedulerConfig.builder()
                .enabled(true)
                .intervalSeconds(300L)
                .readyThresholdPercent(80.0)
                .cutoffBufferMinutes(30)
                .lastConsolidatedCount(0)
                .build();
        when(schedulerConfigRepository.findAll()).thenReturn(List.of(config));
        when(schedulerConfigRepository.save(any(SchedulerConfig.class))).thenAnswer(invocation -> invocation.getArgument(0));

        SchedulerConfigResponse response = manager.updateConfig(SchedulerConfigRequest.builder()
                .enabled(false)
                .intervalSeconds(120L)
                .build());

        assertFalse(response.isEnabled());
        assertEquals(120L, response.getIntervalSeconds());

        InOrder order = inOrder(scheduler);
        order.verify(scheduler).rescheduleJob(
                org.mockito.ArgumentMatchers.eq(TriggerKey.triggerKey("tripConsolidationTrigger", "routingJobs")),
                any(Trigger.class));
        order.verify(scheduler).pauseJob(JobKey.jobKey("tripConsolidationJob", "routingJobs"));
        verify(scheduler, never()).resumeJob(any(JobKey.class));
    }
}
