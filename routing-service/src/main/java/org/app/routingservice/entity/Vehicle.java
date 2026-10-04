package org.app.routingservice.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "vehicles")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Vehicle {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "vehicle_plate", nullable = false, unique = true, length = 30)
    private String vehiclePlate;

    @Column(name = "model_name", nullable = false, length = 100)
    private String modelName;

    @Column(name = "vehicle_type", nullable = false, length = 30)
    private String vehicleType;

    @Column(name = "payload_capacity_kg", nullable = false)
    private Double payloadCapacity;

    @Column(name = "current_hub", length = 50, nullable = false)
    private String currentHub;

    @Column(name = "status", nullable = false, length = 30)
    private String status;

    @Column(name = "assigned_driver_name", length = 100)
    private String assignedDriverName;

    @Column(name = "driver_phone", length = 20)
    private String driverPhone;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    public void onCreate() {
        if (this.status == null) {
            this.status = "AVAILABLE";
        }

        if(this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }


    }
}


