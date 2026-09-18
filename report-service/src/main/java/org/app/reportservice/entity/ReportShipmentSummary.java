package org.app.reportservice.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Table(name = "report_shipments",
        indexes = {
                @Index(name = "idx_rep_created_at", columnList = "created_at"),
                @Index(name = "idx_rep_customer_id", columnList = "customer_id"),
                @Index(name = "idx_rep_status", columnList = "current_status")
        })
public class ReportShipmentSummary {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tracking_code", nullable = false, unique = true)
    private String trackingCode;

    @Column(name = "customer_id", nullable = false)
    private Long customerId;

    @Column(name = "sender_name", columnDefinition = "NVARCHAR(255)")
    private String senderName;

    @Column(name = "sender_phone")
    private String senderPhone;

    @Column(name = "sender_address", columnDefinition = "NVARCHAR(500)")
    private String senderAddress;

    @Column(name = "receiver_name", columnDefinition = "NVARCHAR(255)")
    private String receiverName;

    @Column(name = "receiver_phone")
    private String receiverPhone;

    @Column(name = "receiver_address", columnDefinition = "NVARCHAR(500)")
    private String receiverAddress;

    @Column(name = "service_type")
    private String serviceType;

    @Column(name = "weight")
    private Double weight;

    @Column(name = "shipping_fee")
    private BigDecimal shippingFee;

    @Column(name = "cod_amount")
    private BigDecimal codAmount;

    @Column(name = "total_fee")
    private BigDecimal totalFee;

    @Column(name = "current_status", nullable = false)
    private String currentStatus;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "cod_settlement_status")
    private String codSettlementStatus;
}
