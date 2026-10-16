package org.app.supportservice.service;

import org.app.supportservice.entity.ChatOutbox;
import org.app.supportservice.entity.SupportTicket;
import org.app.supportservice.entity.TicketMessage;
import org.app.supportservice.repository.ChatOutboxRepository;
import org.app.supportservice.repository.TicketMessageRepository;
import org.junit.jupiter.api.Test;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.SendResult;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class ChatOutboxPublisherTest {
    @Test void failedKafkaDeliveryRemainsPendingAndCanBeRetriedWithTheSameMessageId() {
        ChatOutboxRepository outbox = mock(ChatOutboxRepository.class);
        TicketMessageRepository messages = mock(TicketMessageRepository.class);
        @SuppressWarnings("unchecked") KafkaTemplate<String, Object> kafka = mock(KafkaTemplate.class);
        ChatOutboxPublisher publisher = new ChatOutboxPublisher(outbox, messages, kafka);
        ChatOutbox row = ChatOutbox.builder().messageId(7L).nextAttemptAt(LocalDateTime.now()).build();
        when(outbox.findTop20ByDeliveredFalseAndNextAttemptAtLessThanEqualOrderByMessageIdAsc(any())).thenReturn(List.of(row));
        when(messages.findById(7L)).thenReturn(Optional.of(TicketMessage.builder().id(7L).content("message")
                .ticket(SupportTicket.builder().id(1L).ticketCode("TKT-1").build()).build()));
        when(kafka.send(eq("support-chat-events"), eq("TKT-1"), any(Object.class)))
                .thenReturn(CompletableFuture.failedFuture(new IllegalStateException("offline")));
        publisher.publishPending();
        assertFalse(row.isDelivered());
        assertTrue(row.getNextAttemptAt().isAfter(LocalDateTime.now()));
        when(kafka.send(eq("support-chat-events"), eq("TKT-1"), any(Object.class)))
                .thenReturn(CompletableFuture.completedFuture(mock(SendResult.class)));
        publisher.publishPending();
        assertTrue(row.isDelivered());
    }
}
