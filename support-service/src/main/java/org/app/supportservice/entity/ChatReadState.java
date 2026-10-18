package org.app.supportservice.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity @Table(name = "support_chat_read_state")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class ChatReadState {
    @Id @Column(length = 120) private String id;
    private Long ticketId;
    @Column(length = 80) private String readerKey;
    private boolean staff;
    private long lastReadMessageId;
    private long notificationReadMessageId;
}
