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

    @Column(name = "origin_post_office", length = 50)
    private String originPostOffice;

    @Column(name = "dest_post_office", length = 50)
    private String destPostOffice;

    @Column(name = "route_code", nullable = false)
    private String routeCode;

    @Column(name = "status", nullable = false)
    private String status;

    @Column(name = "weight")
    private Double weight;

    @Column(name = "service_type")
    private String serviceType;

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

        if(this.weight == null) {
            this.weight = 1.0;
        }

        if(this.serviceType == null) {
            this.serviceType = "EXPRESS";
        }
    }

}
