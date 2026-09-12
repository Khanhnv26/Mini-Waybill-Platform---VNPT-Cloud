package org.app.trackingservice.entity;


import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.app.sharedevents.entity.OperationType;
import org.app.sharedevents.entity.TransportLeg;

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

    @Column(name = "event_id", length = 100)
    private String eventId;

    @Enumerated(EnumType.STRING)
    @Column(name = "operation_type", length = 100)
    private OperationType operationType;

    @Enumerated(EnumType.STRING)
    @Column(name = "transport_leg", length = 100)
    private TransportLeg transportLeg;

    @Column(name = "trip_code", length = 100)
    private String tripCode;

    @Column(name = "actor_id", length = 100)
    private String actorId;

}
