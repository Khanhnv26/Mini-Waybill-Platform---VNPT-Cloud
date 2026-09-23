package org.app.supportservice.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.app.supportservice.entity.SupportTicket;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TicketResponse {
    private Long id;
    private String ticketCode;
    private String trackingCode;
    private Long creatorUserId;
    private String creatorName;
    private String creatorPhone;
    private String creatorEmail;
    private String category;
    private String priority;
    private String status;
    private String title;
    private String description;
    private BigDecimal compensationAmount;
    private Long assignedToUserId;
    private String assignedToName;
    private String resolutionNote;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime closedAt;
    private List<MessageResponse> messages;

    public static TicketResponse fromEntity(SupportTicket ticket) {
        if (ticket == null) return null;

        List<MessageResponse> msgResponses = (ticket.getMessages() != null)
                ? ticket.getMessages().stream().map(MessageResponse::fromEntity).collect(Collectors.toList())
                : Collections.emptyList();

        return TicketResponse.builder()
                .id(ticket.getId())
                .ticketCode(ticket.getTicketCode())
                .trackingCode(ticket.getTrackingCode())
                .creatorUserId(ticket.getCreatorUserId())
                .creatorName(ticket.getCreatorName())
                .creatorPhone(ticket.getCreatorPhone())
                .creatorEmail(ticket.getCreatorEmail())
                .category(ticket.getCategory())
                .priority(ticket.getPriority())
                .status(ticket.getStatus())
                .title(ticket.getTitle())
                .description(ticket.getDescription())
                .compensationAmount(ticket.getCompensationAmount())
                .assignedToUserId(ticket.getAssignedToUserId())
                .assignedToName(ticket.getAssignedToName())
                .resolutionNote(ticket.getResolutionNote())
                .createdAt(ticket.getCreatedAt())
                .updatedAt(ticket.getUpdatedAt())
                .closedAt(ticket.getClosedAt())
                .messages(msgResponses)
                .build();
    }
}
