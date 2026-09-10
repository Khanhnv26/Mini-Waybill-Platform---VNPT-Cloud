package org.app.routingservice.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "scheduler_config")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SchedulerConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "enabled", nullable = false)
    @Builder.Default
    private Boolean enabled = true;

    @Column(name = "interval_seconds", nullable = false)
    @Builder.Default
    private Long intervalSeconds = 300L;

    @Column(name = "fixed_cron_times", length = 255)
    @Builder.Default
    private String fixedCronTimes = "08:00,12:00,18:00,22:00";

    @Column(name = "ready_threshold_percent", nullable = false)
    @Builder.Default
    private Double readyThresholdPercent = 80.0;

    @Column(name = "cutoff_buffer_minutes", nullable = false)
    @Builder.Default
    private Integer cutoffBufferMinutes = 30;

    @Column(name = "last_run_time")
    private LocalDateTime lastRunTime;

    @Column(name = "last_consolidated_count")
    @Builder.Default
    private Integer lastConsolidatedCount = 0;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    @PreUpdate
    public void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
