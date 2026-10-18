package org.app.supportservice.service;

import org.app.supportservice.client.ShipmentClient;
import org.app.supportservice.dto.request.AddMessageRequest;
import org.app.supportservice.entity.*;
import org.app.supportservice.repository.*;
import org.app.supportservice.service.impl.TicketServiceImpl;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.transaction.*;
import org.springframework.transaction.annotation.*;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;
import java.util.concurrent.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@DataJpaTest(properties = {"spring.datasource.url=jdbc:h2:mem:chat_persistence;MODE=MSSQLServer;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver", "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false", "spring.jpa.show-sql=false"})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class ChatPersistenceTest {
    @Autowired SupportTicketRepository tickets;
    @Autowired TicketMessageRepository messages;
    @Autowired ChatReadStateRepository readers;
    @Autowired ChatOutboxRepository outbox;
    @Autowired PlatformTransactionManager transactions;
    TicketServiceImpl sender;
    TicketChatService chat;
    @SuppressWarnings("unchecked") KafkaTemplate<String, Object> kafka = mock(KafkaTemplate.class);

    @BeforeEach void setup() {
        var access = new TicketAccessService(tickets);
        var storage = mock(MinioStorageService.class);
        sender = new TicketServiceImpl(tickets, messages, mock(RabbitTemplate.class), mock(ShipmentClient.class), kafka, access, outbox, storage);
        chat = new TicketChatService(tickets, messages, readers, access, storage, kafka);
    }
    SupportTicket ticket(String code) {
        return tickets.saveAndFlush(SupportTicket.builder().ticketCode(code).creatorUserId(10L)
                .creatorName("Customer").creatorPhone("0900000000").category("OTHER")
                .title("Support").description("Help").build());
    }
    AddMessageRequest request(String key, String content) {
        var request = new AddMessageRequest(); request.setContent(content); request.setClientMessageId(key); return request;
    }
    TicketChatService.Caller customer() { return new TicketChatService.Caller(10L, "CUSTOMER", null); }
    TicketChatService.Caller staff(long id) { return new TicketChatService.Caller(id, "ROLE_CS", null); }

    @Test void retryReturnsTheOriginalMessageEvenAfterClosingAndRejectsChangedPayload() {
        Long id = ticket("TKT-RETRY").getId();
        var request = request("client_retry_0000001", "hello");
        var original = sender.addMessage(id, request, 10L, "CUSTOMER");
        tickets.findById(id).orElseThrow().setStatus("CLOSED");
        assertEquals(original.getId(), sender.addMessage(id, request, 10L, "CUSTOMER").getId());
        assertEquals(1, outbox.count());
        assertThrows(ResponseStatusException.class, () -> sender.addMessage(id,
                request("client_retry_0000001", "different"), 10L, "CUSTOMER"));
        assertThrows(ResponseStatusException.class, () -> sender.addMessage(id, request, 99L, "CUSTOMER"));
    }

    @Test void pagingReadCursorsAndNotificationDismissalRemainIndependent() {
        Long id = ticket("TKT-PAGING").getId();
        var first = sender.addMessage(id, request("staff_message_00001", "one"), 20L, "ROLE_CS");
        var second = sender.addMessage(id, request("staff_message_00002", "two"), 20L, "ROLE_CS");
        var third = sender.addMessage(id, request("staff_message_00003", "three"), 20L, "ROLE_CS");
        var page = chat.page(id, null, null, 2, customer());
        assertTrue(page.hasMore()); assertEquals(List.of(second.getId(), third.getId()), page.messages().stream().map(m -> m.getId()).toList());
        var older = chat.page(id, page.nextCursor(), null, 2, customer());
        assertEquals(first.getId(), older.messages().getFirst().getId()); assertFalse(older.hasMore());
        chat.mark(id, second.getId(), true, customer());
        assertEquals(3, chat.readStatus(id, customer()).unreadCount());
        assertTrue(chat.inbox(customer(), null).stream().filter(n -> n.id().equals(second.getId())).findFirst().orElseThrow().isRead());
        chat.mark(id, third.getId(), false, customer());
        chat.mark(id, first.getId(), false, customer());
        assertEquals(third.getId(), chat.readStatus(id, customer()).lastReadMessageId());
        assertEquals(0, chat.readStatus(id, customer()).unreadCount());
        assertTrue(chat.summary(customer()).isEmpty());
    }

    @Test void anyStaffReadIsVisibleToCustomerButStaffUnreadCountsRemainPersonal() {
        Long id = ticket("TKT-READERS").getId();
        var message = sender.addMessage(id, request("customer_message_001", "hello"), 10L, "CUSTOMER");
        chat.mark(id, message.getId(), false, staff(20));
        assertEquals(message.getId(), chat.readStatus(id, customer()).counterpartReadMessageId());
        assertEquals(0, chat.readStatus(id, staff(20)).unreadCount());
        assertEquals(1, chat.readStatus(id, staff(21)).unreadCount());
        assertEquals(1, chat.summary(staff(21)).getFirst().unreadCount());
        var unrelated = ticket("TKT-UNRELATED");
        assertThrows(ResponseStatusException.class, () -> chat.mark(unrelated.getId(), message.getId(), false, customer()));
        assertThrows(ResponseStatusException.class, () -> chat.page(id, null, null, 50,
                new TicketChatService.Caller(999L, "CUSTOMER", null)));
    }

    @Test void guestCapabilitiesCannotReadAnotherTicketsMessagesOrInbox() {
        var guestTicket = ticket("TKT-GUEST"); guestTicket.setCreatorUserId(0L);
        guestTicket.setGuestAccessHash(TicketAccessService.hash("secret")); tickets.flush();
        var guest = new TicketChatService.Caller(null, "", "secret");
        var wrong = new TicketChatService.Caller(null, "", "wrong");
        sender.addMessage(guestTicket.getId(), request("staff_guest_message1", "hello"), 20L, "ROLE_CS");
        assertEquals(1, chat.inbox(guest, guestTicket.getId()).size());
        assertThrows(ResponseStatusException.class, () -> chat.inbox(wrong, guestTicket.getId()));
        assertThrows(ResponseStatusException.class, () -> chat.inbox(guest, null));
    }

    @Test @Transactional(propagation = Propagation.NOT_SUPPORTED)
    void concurrentRetriesCreateOneMessageAndOneOutbox() throws Exception {
        var tx = new TransactionTemplate(transactions); tx.setTimeout(10);
        Long id = tx.execute(status -> ticket("TKT-CONCURRENT").getId());
        var gate = new CountDownLatch(1);
        try (var executor = Executors.newFixedThreadPool(2)) {
            Callable<Long> submit = () -> {
                gate.await();
                return tx.execute(status -> sender.addMessage(id, request("concurrent_client_001", "hello"), 10L, "CUSTOMER").getId());
            };
            var a = executor.submit(submit); var b = executor.submit(submit); gate.countDown();
            assertEquals(a.get(15, TimeUnit.SECONDS), b.get(15, TimeUnit.SECONDS));
            tx.executeWithoutResult(status -> {
                assertEquals(1, messages.findByTicketIdOrderByCreatedAtAsc(id).size());
                assertEquals(1, outbox.count());
            });
        } finally {
            tx.executeWithoutResult(status -> { outbox.deleteAll(); messages.deleteAll(); readers.deleteAll(); tickets.deleteAll(); });
        }
    }
}
