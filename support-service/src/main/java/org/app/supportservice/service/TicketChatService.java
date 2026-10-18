package org.app.supportservice.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.app.sharedevents.entity.TicketChatMessageEvent;
import org.app.sharedevents.security.RoleAccess;
import org.app.supportservice.dto.response.MessageResponse;
import org.app.supportservice.entity.*;
import org.app.supportservice.repository.*;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;

@Service @RequiredArgsConstructor @Slf4j
public class TicketChatService {
    private final SupportTicketRepository tickets;
    private final TicketMessageRepository messages;
    private final ChatReadStateRepository readers;
    private final TicketAccessService access;
    private final MinioStorageService storage;
    private final KafkaTemplate<String, Object> kafka;

    public record Caller(Long userId, String roles, String token) {
        public boolean staff() { return userId != null && userId > 0 && RoleAccess.hasAny(roles, "CS", "ADMIN"); }
        public String key(Long ticketId) { return userId != null && userId > 0 ? "user:" + userId : "guest:" + ticketId; }
    }
    public record ReadStatus(long lastReadMessageId, long counterpartReadMessageId, long unreadCount) {}
    public record MessagePage(List<MessageResponse> messages, boolean hasMore, Long nextCursor,
                              ReadStatus read, String status, String assignedToName, Long assignedToUserId) {}
    public record Notice(Long id, Long ticketId, String ticketCode, String senderName, String content,
                         java.time.LocalDateTime createdAt, boolean isRead) {}
    public record Summary(Long ticketId, long unreadCount) {}

    private SupportTicket check(Long id, Caller caller) {
        SupportTicket ticket = tickets.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        access.check(ticket, caller.userId(), caller.roles(), caller.token());
        return ticket;
    }

    @Transactional(readOnly = true)
    public org.app.supportservice.dto.response.TicketResponse metadata(Long id, String code, Caller caller) {
        if (id == null) id = tickets.findByTicketCode(code.trim().toUpperCase(Locale.ROOT))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND)).getId();
        return org.app.supportservice.dto.response.TicketResponse.fromEntity(check(id, caller), false);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> context(Long id, Caller caller) {
        SupportTicket ticket = check(id, caller);
        return Map.of("customerKey", ticket.getCreatorUserId() == null || ticket.getCreatorUserId() == 0
                        ? "guest:" + id : "user:" + ticket.getCreatorUserId(),
                "staffKey", ticket.getAssignedToUserId() == null ? "" : "user:" + ticket.getAssignedToUserId(),
                "callerKey", caller.key(id), "staff", caller.staff());
    }

    @Transactional(readOnly = true)
    public MessagePage page(Long id, Long beforeId, Long afterId, int limit, Caller caller) {
        SupportTicket ticket = check(id, caller);
        if ((beforeId != null && afterId != null) || limit < 1 || limit > 100
                || (beforeId != null && beforeId < 1) || (afterId != null && afterId < 0)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cursor hoặc giới hạn tin không hợp lệ");
        }
        boolean forward = afterId != null;
        List<TicketMessage> found = forward
                ? messages.findByTicketIdAndIdGreaterThanOrderByIdAsc(id, afterId, PageRequest.of(0, limit + 1))
                : messages.findByTicketIdAndIdLessThanOrderByIdDesc(id, beforeId == null ? Long.MAX_VALUE : beforeId, PageRequest.of(0, limit + 1));
        boolean more = found.size() > limit;
        List<TicketMessage> selected = new ArrayList<>(found.subList(0, Math.min(limit, found.size())));
        Long cursor = selected.isEmpty() ? null : selected.getLast().getId();
        if (!forward) Collections.reverse(selected);
        return new MessagePage(selected.stream().map(this::response).toList(), more, cursor, readStatus(id, caller),
                ticket.getStatus(), ticket.getAssignedToName(), ticket.getAssignedToUserId());
    }

    private MessageResponse response(TicketMessage message) {
        MessageResponse response = MessageResponse.fromEntity(message);
        response.setAttachmentUrls(storage.signedUrl(message.getAttachmentUrls()));
        return response;
    }

    public ReadStatus readStatus(Long id, Caller caller) {
        List<ChatReadState> states = readers.findByTicketId(id);
        long own = states.stream().filter(r -> r.getReaderKey().equals(caller.key(id)))
                .mapToLong(ChatReadState::getLastReadMessageId).max().orElse(0);
        long counterpart = states.stream().filter(r -> r.isStaff() != caller.staff())
                .mapToLong(ChatReadState::getLastReadMessageId).max().orElse(0);
        return new ReadStatus(own, counterpart, messages.unread(id, own, caller.key(id), caller.staff()));
    }

    @Transactional
    public ReadStatus mark(Long id, long messageId, boolean notificationOnly, Caller caller) {
        SupportTicket ticket = tickets.lockById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        access.check(ticket, caller.userId(), caller.roles(), caller.token());
        TicketMessage message = messages.findById(messageId).orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST));
        if (!message.getTicket().getId().equals(id)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        String key = caller.key(id);
        ChatReadState state = readers.findById(id + ":" + key).orElseGet(() -> ChatReadState.builder()
                .id(id + ":" + key).ticketId(id).readerKey(key).staff(caller.staff()).build());
        long oldRead = state.getLastReadMessageId();
        state.setStaff(caller.staff());
        if (!notificationOnly) state.setLastReadMessageId(Math.max(oldRead, messageId));
        state.setNotificationReadMessageId(Math.max(state.getNotificationReadMessageId(), messageId));
        readers.saveAndFlush(state);
        if (!notificationOnly && state.getLastReadMessageId() > oldRead) {
            TicketChatMessageEvent event = TicketChatMessageEvent.builder().eventType("READ").ticketId(id)
                    .ticketCode(ticket.getTicketCode()).readerKey(key).staffReader(caller.staff())
                    .lastReadMessageId(state.getLastReadMessageId()).build();
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override public void afterCommit() {
                    try { kafka.send("support-chat-events", ticket.getTicketCode(), event)
                            .whenComplete((result, error) -> { if (error != null) log.warn("Read receipt will be reconciled by polling: {}", id); }); }
                    catch (RuntimeException error) { log.warn("Read receipt will be reconciled by polling: {}", id); }
                }
            });
        }
        return readStatus(id, caller);
    }

    @Transactional(readOnly = true)
    public List<Notice> inbox(Caller caller, Long guestTicketId) {
        List<String> audiences = new ArrayList<>();
        if (guestTicketId != null) {
            check(guestTicketId, caller);
            // A guest capability must not become a subscription for another logged-in account.
            audiences.add(caller.key(guestTicketId));
        } else {
            if (caller.userId() == null || caller.userId() <= 0) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
            audiences.add(caller.key(null));
            if (caller.staff()) audiences.add("staff");
        }
        Map<Long, Long> dismissed = new HashMap<>();
        return messages.findByAudienceKeyInOrderByIdDesc(audiences, PageRequest.of(0, 100)).stream()
                .filter(m -> !Objects.equals(m.getSenderKey(), caller.key(m.getTicket().getId())))
                .map(m -> {
                    Long id = m.getTicket().getId();
                    long seen = dismissed.computeIfAbsent(id, ignored -> readers.findById(id + ":" + caller.key(id))
                            .map(ChatReadState::getNotificationReadMessageId).orElse(0L));
                    return new Notice(m.getId(), id, m.getTicket().getTicketCode(), m.getSenderName(),
                            m.getContent(), m.getCreatedAt(), m.getId() <= seen);
                }).toList();
    }

    @Transactional(readOnly = true)
    public List<Summary> summary(Caller caller) {
        if (caller.userId() == null || caller.userId() <= 0) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        return messages.unreadSummary(caller.key(null), caller.userId(), caller.staff()).stream()
                .map(row -> new Summary(((Number) row[0]).longValue(), ((Number) row[1]).longValue())).toList();
    }

    @Transactional(readOnly = true)
    public List<Summary> guestSummary(Long id, Caller caller) {
        check(id, caller);
        return List.of(new Summary(id, readStatus(id, caller).unreadCount()));
    }
}
