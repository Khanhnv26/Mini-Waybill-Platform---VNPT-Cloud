package org.app.shipmentservice.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "delivery_failure_decisions")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeliveryFailureDecision {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tracking_code", nullable = false, length = 50)
    private String trackingCode;

    @Column(name = "customer_id", nullable = false)
    private Long customerId;

    @Column(name = "attempt_no", nullable = false)
    private int attemptNo;

    @Column(name = "failed_at", nullable = false)
    private LocalDateTime failedAt;

    @Column(name = "decision_deadline", nullable = false)
    private LocalDateTime decisionDeadline;

    @Column(name = "failure_reason", length = 255)
    private String failureReason;

    @Enumerated(EnumType.STRING)
    @Column(name = "decision", nullable = false, length = 30)
    private FailureDecisionType decision;

    @Column(name = "preferred_date")
    private LocalDate preferredDate;

    @Column(name = "decision_note", length = 500)
    private String decisionNote;

    @Column(name = "new_receiver_phone", length = 20)
    private String newReceiverPhone;

    @Column(name = "new_receiver_address", length = 255)
    private String newReceiverAddress;

    @Column(name = "decided_at")
    private LocalDateTime decidedAt;

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
        if (decision == null) {
            decision = FailureDecisionType.PENDING;
        }
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
