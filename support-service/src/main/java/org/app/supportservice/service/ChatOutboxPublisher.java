package org.app.supportservice.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.app.sharedevents.entity.TicketChatMessageEvent;
import org.app.supportservice.entity.ChatOutbox;
import org.app.supportservice.entity.TicketMessage;
import org.app.supportservice.repository.ChatOutboxRepository;
import org.app.supportservice.repository.TicketMessageRepository;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.concurrent.TimeUnit;

@Service @RequiredArgsConstructor @Slf4j
public class ChatOutboxPublisher {
    private final ChatOutboxRepository outbox;
    private final TicketMessageRepository messages;
    private final KafkaTemplate<String, Object> kafka;

    @Scheduled(fixedDelayString = "${app.chat.outbox-delay-ms:500}")
    @Transactional
    public void publishPending() {
        for (ChatOutbox row : outbox.findTop20ByDeliveredFalseAndNextAttemptAtLessThanEqualOrderByMessageIdAsc(LocalDateTime.now())) {
            TicketMessage message = messages.findById(row.getMessageId()).orElseThrow();
            TicketChatMessageEvent event = TicketChatMessageEvent.builder()
                    .ticketId(message.getTicket().getId()).ticketCode(message.getTicket().getTicketCode())
                    .messageId(message.getId()).senderId(message.getSenderId()).senderName(message.getSenderName())
                    .senderRole(message.getSenderRole()).content(message.getContent())
                    .attachmentUrls(message.getAttachmentUrls()).createdAt(message.getCreatedAt()).build();
            try {
                kafka.send("support-chat-events", event.getTicketCode(), event).get(5, TimeUnit.SECONDS);
                row.setDelivered(true);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return;
            } catch (Exception e) {
                row.setNextAttemptAt(LocalDateTime.now().plusSeconds(10));
                log.warn("[CHAT-OUTBOX] Sẽ gửi lại messageId={} sau lỗi Kafka", row.getMessageId());
                return;
            }
        }
    }
}
