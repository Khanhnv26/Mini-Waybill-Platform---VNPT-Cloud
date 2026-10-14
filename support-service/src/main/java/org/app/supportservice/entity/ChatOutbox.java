package org.app.supportservice.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "support_chat_outbox")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ChatOutbox {
    @Id @Column(name = "message_id") private Long messageId;
    @Column(name = "delivered", nullable = false) private boolean delivered;
    @Column(name = "next_attempt_at", nullable = false) private LocalDateTime nextAttemptAt;
}
