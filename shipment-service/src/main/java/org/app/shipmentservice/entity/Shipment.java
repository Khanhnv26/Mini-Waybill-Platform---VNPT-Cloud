package org.app.shipmentservice.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;


@Table(name = "shipments")
@Entity
@AllArgsConstructor
@NoArgsConstructor
@Data
@Builder
public class Shipment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tracking_code", nullable = false, unique = true)
    private String trackingCode;

    @Column(name = "customer_id", nullable = false)
    private Long customerId;

    @Column(name = "sender_name", nullable = false)
    private String senderName;

    @Column(name = "sender_phone", nullable = false)
    private String senderPhone;

    @Column(name = "sender_address", nullable = false)
    private String senderAddress;

    @Column(name = "receiver_name", nullable = false)
    private String receiverName;

    @Column(name = "receiver_phone", nullable = false)
    private String receiverPhone;

    @Column(name = "receiver_address", nullable = false)
    private String receiverAddress;

    @Column(name = "service_type", nullable = false)
    @Enumerated(EnumType.STRING)
    private ServiceType serviceType;

    @Column(name = "weight", nullable = false)
    private Double weight;

    @Column(name = "cod_amount", nullable = false)
    private BigDecimal codAmount;

    @Column(name = "current_status", nullable = false)
    @Enumerated(EnumType.STRING)
    private ShipmentStatus currentStatus;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (this.codAmount == null) {
            this.codAmount = BigDecimal.ZERO;
        }
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
        if (this.currentStatus == null) {
            this.currentStatus = ShipmentStatus.PENDING_ROUTING;
        }
    }


}
