package org.app.routingservice.entity;


import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.app.sharedevents.entity.TransportLeg;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@AllArgsConstructor
@NoArgsConstructor
@Data
@Builder
@Table(name = "trip_manifests")
public class TripManifest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "trip_id", nullable = false)
    private Long tripId;

    @Column(name ="tracking_code", nullable = false, length = 50)
    private String trackingCode;

    @Column(name = "origin_hub", nullable = false, length = 50)
    private String originHub;

    @Column(name = "destination_hub", nullable = false, length = 50)
    private String destinationHub;

    @Column(name = "pickup_location_code", length = 50)
    private String pickupLocationCode;

    @Column(name = "dropoff_location_code", length = 50)
    private String dropoffLocationCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "transport_leg", length = 30)
    private TransportLeg transportLeg;

    @Column(name = "weight_kg", nullable = false)
    private Double weightKg;

    @Column(name = "service_type", nullable = false, length = 30)
    private String serviceType;

    @Column(name = "status", nullable = false, length = 30)
    private String status;

    @Column(name = "loaded_at")
    private LocalDateTime loadedAt;

    @Column(name = "unloaded_at")
    private LocalDateTime unloadedAt;

    @PrePersist
    public void onCreate() {
        if (this.status == null) {
            this.status = "LOADED";
        }

        if(this.loadedAt == null) {
            this.loadedAt = LocalDateTime.now();
        }
    }

}
