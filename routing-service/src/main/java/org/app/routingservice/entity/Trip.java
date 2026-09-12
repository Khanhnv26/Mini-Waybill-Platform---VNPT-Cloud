package org.app.routingservice.entity;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "trips")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@ToString(exclude = "stops")
@EqualsAndHashCode(exclude = "stops")
public class Trip {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "trip_code", nullable = false, unique = true,length = 50)
    private String tripCode;

    @Column(name = "route_name", length = 150, nullable = false)
    private String routeName;

    @Column(name = "vehicle_plate", length = 30, nullable = false)
    private String vehiclePlate;

    @Column(name = "driver_name", length = 100, nullable = false)
    private String driverName;

    @Column(name = "max_weight_kg", nullable = false)
    private Double maxWeight;

    @Column(name = "current_weight_kg", nullable = false)
    private Double currentWeight;

    @Column(name = "total_shipments", nullable = false)
    private Integer totalShipments;

    @Column(name = "current_hub", length = 50, nullable = false)
    private String currentHub;

    @Enumerated(EnumType.STRING)
    @Column(name = "trip_type", length = 30)
    private TripType tripType;

    @Column(name = "current_latitude")
    private Double currentLatitude;

    @Column(name = "current_longitude")
    private Double currentLongitude;

    @Column(name = "last_progress_at")
    private LocalDateTime lastProgressAt;

    @Column(name = "progress_percent")
    private Double progressPercent;

    @Column(name = "status", length = 30, nullable = false)
    private String status;

    @Column(name = "departure_time")
    private LocalDateTime departureTime;

    @Column(name = "scheduled_departure_time")
    private LocalDateTime scheduledDepartureTime;

    @Column(name = "cutoff_time")
    private LocalDateTime cutoffTime;

    @Column(name = "ready_to_depart")
    @Builder.Default
    private Boolean readyToDepart = false;

    @Column(name = "created_at")
    private LocalDateTime createdAt;


    @OneToMany(mappedBy = "trip", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("stopOrder ASC")
    @Builder.Default
    @JsonManagedReference
    private List<TripStop> stops = new ArrayList<>();

    @PrePersist
    public void onCreate() {
        if (this.currentWeight == null) {
            this.currentWeight = 0.0;
        }

        if (this.maxWeight == null) {
            this.maxWeight = 5000.0;
        }

        if (this.totalShipments == null) {
            this.totalShipments = 0;
        }
        if (this.status == null) {
            this.status = "SCHEDULED";
        }
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
    }




}
