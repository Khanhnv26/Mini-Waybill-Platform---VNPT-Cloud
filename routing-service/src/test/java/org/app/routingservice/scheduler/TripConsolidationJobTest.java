package org.app.routingservice.scheduler;

import org.app.routingservice.entity.SchedulerConfig;
import org.app.routingservice.repository.SchedulerConfigRepository;
import org.app.routingservice.service.TripService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TripConsolidationJobTest {

    @Mock
    private TripService tripService;

    @Mock
    private SchedulerConfigRepository schedulerConfigRepository;

    @InjectMocks
    private TripConsolidationJob job;

    @Test
    @DisplayName("Lịch đang tắt thì job không gom đơn")
    void executeInternal_whenDisabled_doesNotConsolidate() throws Exception {
        when(schedulerConfigRepository.findAll()).thenReturn(List.of(
                SchedulerConfig.builder().enabled(false).build()));

        job.executeInternal(null);

        verify(tripService, never()).consolidateAllScheduledTrips();
        verify(schedulerConfigRepository, never()).save(any(SchedulerConfig.class));
    }
}
