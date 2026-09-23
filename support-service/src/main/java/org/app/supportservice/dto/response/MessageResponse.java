package org.app.supportservice.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.app.supportservice.entity.TicketMessage;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MessageResponse {
    private Long id;
    private Long senderId;
    private String senderName;
    private String senderRole;
    private String content;
    private String attachmentUrls;
    private LocalDateTime createdAt;

    public static MessageResponse fromEntity(TicketMessage msg) {
        if (msg == null) return null;
        return MessageResponse.builder()
                .id(msg.getId())
                .senderId(msg.getSenderId())
                .senderName(msg.getSenderName())
                .senderRole(msg.getSenderRole())
                .content(msg.getContent())
                .attachmentUrls(msg.getAttachmentUrls())
                .createdAt(msg.getCreatedAt())
                .build();
    }
}
