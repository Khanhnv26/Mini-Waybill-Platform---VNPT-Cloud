package org.app.trackingservice.entity;


import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@AllArgsConstructor
@NoArgsConstructor
@Table(name = "tracking_history")
@Builder
@Data
public class TrackingHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tracking_code", nullable = false)
    private String trackingCode;

    @Column(name = "status", nullable = false)
    private String status;

    @Column(name = "location_code", nullable = false, columnDefinition = "NVARCHAR(100)")
    private String locationCode;

    @Column(name = "node", nullable = false, columnDefinition = "NVARCHAR(500)")
    private String node;

    @Column(name = "occurred_at", nullable = false)
    private LocalDateTime occurredAt;

}
