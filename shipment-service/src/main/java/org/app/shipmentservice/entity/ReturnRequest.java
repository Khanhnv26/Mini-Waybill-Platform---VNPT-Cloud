package org.app.shipmentservice.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "return_requests")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReturnRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tracking_code", nullable = false, length = 50)
    private String trackingCode;

    @Column(name = "customer_id", nullable = false)
    private Long customerId;

    @Enumerated(EnumType.STRING)
    @Column(name = "initiator", nullable = false, length = 30)
    private ReturnInitiator initiator;

    @Column(name = "reason_code", nullable = false, length = 50)
    private String reasonCode;

    @Column(name = "reason_note", length = 500)
    private String reasonNote;

    @Enumerated(EnumType.STRING)
    @Column(name = "return_mode", nullable = false, length = 30)
    private ReturnMode returnMode;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private ReturnRequestStatus status;

    @Column(name = "postal_fault", nullable = false)
    private boolean postalFault;

    @Column(name = "return_fee", nullable = false, precision = 18, scale = 2)
    private BigDecimal returnFee;

    @Enumerated(EnumType.STRING)
    @Column(name = "fee_payment_status", nullable = false, length = 30)
    private FeePaymentStatus feePaymentStatus;

    @Column(name = "arrived_origin_at")
    private LocalDateTime arrivedOriginAt;

    @Column(name = "pickup_deadline")
    private LocalDateTime pickupDeadline;

    @Column(name = "requested_by", length = 100)
    private String requestedBy;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    public void prePersist() {
        LocalDateTime now = LocalDateTime.now();
        if (createdAt == null) {
            createdAt = now;
        }
        if (updatedAt == null) {
            updatedAt = now;
        }
        if (status == null) {
            status = ReturnRequestStatus.PENDING;
        }
        if (feePaymentStatus == null) {
            feePaymentStatus = FeePaymentStatus.UNPAID;
        }
        if (returnFee == null) {
            returnFee = BigDecimal.ZERO;
        }
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
