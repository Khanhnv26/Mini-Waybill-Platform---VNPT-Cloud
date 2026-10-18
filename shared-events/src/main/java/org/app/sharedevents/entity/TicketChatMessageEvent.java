package org.app.sharedevents.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.*;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class TicketChatMessageEvent {
    private Long ticketId;
    private String ticketCode;
    private Long messageId;
    private String clientMessageId;
    private String audienceKey;
    private String eventType;
    private String readerKey;
    private Boolean staffReader;
    private Long lastReadMessageId;
    private Long senderId;
    private String senderName;
    private String senderRole;
    private String content;
    private String attachmentUrls;
    private LocalDateTime createdAt;
}
