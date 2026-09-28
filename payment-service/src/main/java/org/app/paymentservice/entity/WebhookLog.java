package org.app.paymentservice.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "payment_webhook_logs")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WebhookLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "gateway_name", nullable = false, length = 50)
    private String gatewayName;

    @Column(name = "raw_payload", nullable = false, columnDefinition = "NVARCHAR(MAX)")
    private String rawPayload;

    @Column(name = "signature", length = 255)
    private String signature;

    @Column(name = "is_processed", nullable = false)
    private Boolean isProcessed;

    @Column(name = "error_message", length = 500)
    private String errorMessage;

    @Column(name = "received_at", nullable = false)
    private LocalDateTime receivedAt;

    @PrePersist
    public void prePersist() {
        if (this.receivedAt == null) {
            this.receivedAt = LocalDateTime.now();
        }
        if (this.isProcessed == null) {
            this.isProcessed = false;
        }
    }
}
