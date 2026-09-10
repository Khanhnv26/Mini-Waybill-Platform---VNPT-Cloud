package org.app.routingservice.dto.trip;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class SchedulerConfigResponse {
    private boolean enabled;
    private long intervalSeconds;
    private String fixedCronTimes;
    private double readyThresholdPercent;
    private int cutoffBufferMinutes;
    private LocalDateTime lastRunTime;
    private int lastConsolidatedCount;
}
