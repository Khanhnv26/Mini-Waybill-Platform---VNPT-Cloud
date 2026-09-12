package org.app.routingservice.entity;

import jakarta.persistence.*;
import lombok.*;
import org.app.sharedevents.entity.OperationType;
import org.app.sharedevents.entity.TransportLeg;

import java.time.LocalDateTime;

@Entity
@Table(name = "handling_events", uniqueConstraints = {
        @UniqueConstraint(name = "uk_handling_operation_id", columnNames = "operation_id")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@ToString
public class HandlingEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "operation_id", nullable = false, length = 100)
    private String operationId;

    @Column(name = "tracking_code", nullable = false, length = 50)
    private String trackingCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "operation_type", nullable = false, length = 50)
    private OperationType operationType;

    @Enumerated(EnumType.STRING)
    @Column(name = "transport_leg", length = 30)
    private TransportLeg transportLeg;

    @Column(name = "location_code", nullable = false, length = 50)
    private String locationCode;

    @Column(name = "trip_code", length = 50)
    private String tripCode;

    @Column(name = "actor_id", length = 100)
    private String actorId;

    @Column(name = "note", columnDefinition = "NVARCHAR(1000)")
    private String note;

    @Column(name = "occurred_at", nullable = false)
    private LocalDateTime occurredAt;

    @PrePersist
    protected void onCreate() {
        if (occurredAt == null) occurredAt = LocalDateTime.now();
    }
}
