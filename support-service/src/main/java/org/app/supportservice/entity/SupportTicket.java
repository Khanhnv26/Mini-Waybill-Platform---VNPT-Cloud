package org.app.supportservice.entity;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@AllArgsConstructor
@NoArgsConstructor
@Data
@Builder
@Table(name = "support_tickets")
public class SupportTicket {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ticket_code", nullable = false, unique = true, length = 50)
    private String ticketCode;

    @Column(name = "tracking_code", length = 50)
    private String trackingCode;

    @Column(name = "creator_user_id", nullable = false)
    private Long creatorUserId;

    @Column(name = "creator_name", nullable = false, length = 100)
    private String creatorName;

    @Column(name = "creator_phone", nullable = false, length = 20)
    private String creatorPhone;

    @Column(name = "creator_email", length = 100)
    private String creatorEmail;

    @Column(name = "category", nullable = false, length = 40)
    private String category;

    @Column(name = "priority", nullable = false, length = 20)
    private String priority;

    @Column(name = "status", nullable = false, length = 30)
    private String status;

    @Column(name = "title", nullable = false, length = 255)
    private String title;

    @Column(name = "description", nullable = false, columnDefinition = "NVARCHAR(MAX)")
    private String description;

    @Column(name = "compensation_amount", nullable = false)
    private BigDecimal compensationAmount;

    @Column(name = "assigned_to_user_id")
    private Long assignedToUserId;

    @Column(name = "assigned_to_name", length = 100)
    private String assignedToName;

    @Column(name = "resolution_note", columnDefinition = "NVARCHAR(MAX)")
    private String resolutionNote;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "closed_at")
    private LocalDateTime closedAt;

    @OneToMany(mappedBy = "ticket", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference
    @Builder.Default
    private List<TicketMessage> messages = new ArrayList<>();

    @PrePersist
    public void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
        if (this.updatedAt == null) {
            this.updatedAt = LocalDateTime.now();
        }
        if (this.status == null) {
            this.status = "OPEN";
        }
        if (this.priority == null) {
            this.priority = "NORMAL";
        }
        if (this.compensationAmount == null) {
            this.compensationAmount = BigDecimal.ZERO;
        }
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
