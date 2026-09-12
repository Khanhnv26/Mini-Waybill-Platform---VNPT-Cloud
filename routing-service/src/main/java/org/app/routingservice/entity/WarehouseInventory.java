package org.app.routingservice.entity;

import jakarta.persistence.*;
import lombok.*;
import org.app.sharedevents.entity.TransportLeg;

import java.time.LocalDateTime;

@Entity
@Table(name = "warehouse_inventory", uniqueConstraints = {
        @UniqueConstraint(name = "uk_inventory_tracking_code", columnNames = "tracking_code")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@ToString
public class WarehouseInventory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tracking_code", nullable = false, length = 50)
    private String trackingCode;

    @Column(name = "location_code", nullable = false, length = 50)
    private String locationCode;

    @Column(name = "inventory_status", nullable = false, length = 30)
    private String inventoryStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "transport_leg", length = 30)
    private TransportLeg transportLeg;

    @Column(name = "active_trip_id")
    private Long activeTripId;

    @Column(name = "received_at")
    private LocalDateTime receivedAt;

    @Column(name = "stored_at")
    private LocalDateTime storedAt;

    @Column(name = "reserved_at")
    private LocalDateTime reservedAt;

    @Column(name = "loaded_at")
    private LocalDateTime loadedAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Version
    @Column(name = "version", nullable = false)
    private Long version;

    @PrePersist
    protected void onCreate() {
        if (inventoryStatus == null) inventoryStatus = "RECEIVED";
        if (updatedAt == null) updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
