package org.app.supportservice.ai.tools;

import org.app.supportservice.ai.lookup.TariffLookupService;
import org.app.supportservice.ai.lookup.WaybillLookupService;
import org.app.supportservice.entity.SupportTicket;
import org.app.supportservice.repository.SupportTicketRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PostalAiToolsTest {

    @Mock
    private SupportTicketRepository supportTicketRepository;

    @Mock
    private WaybillLookupService waybillLookupService;

    @Mock
    private TariffLookupService tariffLookupService;

    @InjectMocks
    private PostalAiTools postalAiTools;

    @Test
    void ticketLookupUsesUppercaseRealCode() {
        SupportTicket ticket = SupportTicket.builder()
                .ticketCode("TKT-20260923-1234")
                .title("Hàng vỡ")
                .category("DAMAGE")
                .status("OPEN")
                .priority("HIGH")
                .description("Thùng móp")
                .build();
        when(supportTicketRepository.findByTicketCode("TKT-20260923-1234")).thenReturn(Optional.of(ticket));

        String text = postalAiTools.lookUpTicketStatus("  tkt-20260923-1234  ");

        verify(supportTicketRepository).findByTicketCode("TKT-20260923-1234");
        assertTrue(text.contains("TKT-20260923-1234"));
        assertTrue(text.contains("Hàng vỡ"));
    }
}
