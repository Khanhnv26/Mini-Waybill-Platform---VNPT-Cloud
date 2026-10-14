package org.app.supportservice.service;

import org.app.supportservice.entity.SupportTicket;
import org.app.supportservice.repository.SupportTicketRepository;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.mock;

class TicketAccessServiceTest {
    private final TicketAccessService access = new TicketAccessService(mock(SupportTicketRepository.class));

    @Test void customerCannotReadOrWriteAnotherCustomersTicket() {
        SupportTicket ticket = SupportTicket.builder().creatorUserId(10L).build();
        assertDoesNotThrow(() -> access.check(ticket, 10L, "ROLE_CUSTOMER", null));
        assertThrows(ResponseStatusException.class, () -> access.check(ticket, 11L, "ROLE_CUSTOMER", null));
        assertThrows(ResponseStatusException.class, () -> access.check(ticket, null, null, null));
        assertDoesNotThrow(() -> access.check(ticket, 99L, "ROLE_CS", null));
    }

    @Test void anonymousTicketRequiresItsOwnCapabilityAndDoesNotUnlockCustomerTickets() {
        SupportTicket guest = SupportTicket.builder().creatorUserId(0L)
                .guestAccessHash(TicketAccessService.hash("random-test-token")).build();
        assertDoesNotThrow(() -> access.check(guest, null, null, "random-test-token"));
        assertThrows(ResponseStatusException.class, () -> access.check(guest, null, null, "other-token"));
        guest.setCreatorUserId(10L);
        assertThrows(ResponseStatusException.class, () -> access.check(guest, null, null, "random-test-token"));
    }
}
