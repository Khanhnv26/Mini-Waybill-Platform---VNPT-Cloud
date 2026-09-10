package org.app.routingservice.dto.trip;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class SchedulerConfigRequest {
    private Boolean enabled;
    private Long intervalSeconds;
    private String fixedCronTimes;
    private Double readyThresholdPercent;
    private Integer cutoffBufferMinutes;
}
