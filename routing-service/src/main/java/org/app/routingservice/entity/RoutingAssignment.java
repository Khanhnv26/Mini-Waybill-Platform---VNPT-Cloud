package org.app.routingservice.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;


@Entity
@Table(name = "routing")
@AllArgsConstructor
@NoArgsConstructor
@Data
@Builder
public class RoutingAssignment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tracking_code", nullable = false)
    private String trackingCode;

    @Column(name = "source_hub", nullable = false)
    private String sourceHub;

    @Column(name = "destination_hub", nullable = false)
    private String destinationHub;

    @Column(name = "route_code", nullable = false)
    private String routeCode;

    @Column(name = "status", nullable = false)
    private String status;

    @Column(name = "assigned_at", nullable = false)
    LocalDateTime assignedAt;

    @PrePersist
    protected void onCreate() {
        if(this.assignedAt == null) {
            this.assignedAt = LocalDateTime.now();
        }

        if(this.status == null) {
            this.status = "ASSIGNED";
        }
    }

}
