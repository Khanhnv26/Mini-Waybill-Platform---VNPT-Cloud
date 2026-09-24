package org.app.supportservice.service;

import org.app.supportservice.client.ShipmentClient;
import org.app.supportservice.dto.request.AddMessageRequest;
import org.app.supportservice.dto.request.CreateTicketRequest;
import org.app.supportservice.dto.request.ResolveTicketRequest;
import org.app.supportservice.dto.response.MessageResponse;
import org.app.supportservice.dto.response.TicketResponse;
import org.app.supportservice.entity.SupportTicket;
import org.app.supportservice.entity.TicketMessage;
import org.app.supportservice.exception.BadRequestException;
import org.app.supportservice.exception.ResourceNotFoundException;
import org.app.supportservice.repository.SupportTicketRepository;
import org.app.supportservice.repository.TicketMessageRepository;
import org.app.supportservice.service.impl.TicketServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.kafka.core.KafkaTemplate;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TicketServiceImplTest {

    @Mock
    private SupportTicketRepository ticketRepository;

    @Mock
    private TicketMessageRepository messageRepository;

    @Mock
    private RabbitTemplate rabbitTemplate;

    @Mock
    private ShipmentClient shipmentClient;

    @Mock
    private KafkaTemplate<String, Object> kafkaTemplate;

    @InjectMocks
    private TicketServiceImpl ticketService;

    private SupportTicket sampleTicket;

    @BeforeEach
    void setUp() {
        sampleTicket = SupportTicket.builder()
                .id(1L)
                .ticketCode("TKT-20260923-1234")
                .trackingCode("WB123456VN")
                .creatorUserId(10L)
                .creatorName("Nguyen Van A")
                .creatorPhone("0987654321")
                .creatorEmail("vana@example.com")
                .category("DAMAGED_GOODS")
                .priority("NORMAL")
                .status("OPEN")
                .title("Kiện hàng bị móp vỡ")
                .description("Bưu phẩm giao đến nơi bị vỡ nắp")
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .messages(new ArrayList<>())
                .build();
    }

    @Test
    void testCreateTicket_Success() {
        CreateTicketRequest request = new CreateTicketRequest();
        request.setTrackingCode("WB123456VN");
        request.setCreatorName("Nguyen Van A");
        request.setCreatorPhone("0987654321");
        request.setCreatorEmail("vana@example.com");
        request.setCategory("DAMAGED_GOODS");
        request.setPriority("NORMAL");
        request.setTitle("Kiện hàng bị móp vỡ");
        request.setDescription("Bưu phẩm giao đến nơi bị vỡ nắp");

        when(ticketRepository.save(any(SupportTicket.class))).thenAnswer(invocation -> {
            SupportTicket t = invocation.getArgument(0);
            t.setId(1L);
            t.setCreatedAt(LocalDateTime.now());
            t.setUpdatedAt(LocalDateTime.now());
            return t;
        });

        when(messageRepository.save(any(TicketMessage.class))).thenAnswer(invocation -> {
            TicketMessage m = invocation.getArgument(0);
            m.setId(100L);
            return m;
        });

        TicketResponse response = ticketService.createTicket(request, 10L, "vana@example.com");

        assertNotNull(response);
        assertTrue(response.getTicketCode().startsWith("TKT-"));
        assertEquals("WB123456VN", response.getTrackingCode());
        assertEquals("OPEN", response.getStatus());
        assertEquals(1, response.getMessages().size());
        verify(ticketRepository, times(1)).save(any(SupportTicket.class));
        verify(messageRepository, times(1)).save(any(TicketMessage.class));
    }

    @Test
    void testGetTicketByCode_Found() {
        when(ticketRepository.findByTicketCode("TKT-20260923-1234")).thenReturn(Optional.of(sampleTicket));

        TicketResponse response = ticketService.getTicketByCode("TKT-20260923-1234");

        assertNotNull(response);
        assertEquals("TKT-20260923-1234", response.getTicketCode());
        assertEquals("WB123456VN", response.getTrackingCode());
    }

    @Test
    void testGetTicketByCode_NotFound() {
        when(ticketRepository.findByTicketCode("TKT-NONEXISTENT")).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> ticketService.getTicketByCode("TKT-NONEXISTENT"));
    }

    @Test
    void testAddMessage_Success() {
        AddMessageRequest request = new AddMessageRequest();
        request.setContent("CSKH đã kiểm tra và đang làm việc với bưu cục giao");

        when(ticketRepository.findById(1L)).thenReturn(Optional.of(sampleTicket));
        when(messageRepository.save(any(TicketMessage.class))).thenAnswer(invocation -> {
            TicketMessage m = invocation.getArgument(0);
            m.setId(101L);
            m.setCreatedAt(LocalDateTime.now());
            return m;
        });

        MessageResponse response = ticketService.addMessage(1L, request, 99L, "ROLE_CS");

        assertNotNull(response);
        assertEquals(101L, response.getId());
        assertEquals("CSKH đã kiểm tra và đang làm việc với bưu cục giao", response.getContent());
        assertEquals("ROLE_CS", response.getSenderRole());
    }

    @Test
    void testAddMessage_RejectedWhenResolved() {
        sampleTicket.setStatus("RESOLVED");
        when(ticketRepository.findById(1L)).thenReturn(Optional.of(sampleTicket));

        AddMessageRequest request = new AddMessageRequest();
        request.setContent("Nhắn thêm sau khi đã đóng");

        assertThrows(BadRequestException.class, () -> ticketService.addMessage(1L, request, 10L, "CUSTOMER"));
        verify(messageRepository, never()).save(any(TicketMessage.class));
    }

    @Test
    void testAssignTicket_RequiresStaffId() {
        assertThrows(BadRequestException.class, () -> ticketService.assignTicket(1L, null, "Chuyên viên CSKH"));
        verify(ticketRepository, never()).save(any(SupportTicket.class));
    }

    @Test
    void testResolveTicket_Success() {
        ResolveTicketRequest request = new ResolveTicketRequest();
        request.setCompensationAmount(new BigDecimal("250000"));
        request.setResolutionNote("Bồi thường 100% giá trị do va đập trong quá trình vận chuyển");

        when(ticketRepository.findById(1L)).thenReturn(Optional.of(sampleTicket));
        when(ticketRepository.save(any(SupportTicket.class))).thenAnswer(invocation -> invocation.getArgument(0));

        TicketResponse response = ticketService.resolveTicket(1L, request);

        assertNotNull(response);
        assertEquals("RESOLVED", response.getStatus());
        assertEquals(new BigDecimal("250000"), response.getCompensationAmount());
        assertEquals("Bồi thường 100% giá trị do va đập trong quá trình vận chuyển", response.getResolutionNote());
        verify(shipmentClient).cancelShipment(eq("WB123456VN"), any(Map.class), eq("ROLE_CS"), eq("shipment:cancel_all"));
    }

    @Test
    void testResolveTicket_LostShipmentCancelsWaybill() {
        sampleTicket.setCategory("LOST_SHIPMENT");
        ResolveTicketRequest request = new ResolveTicketRequest();
        request.setResolutionNote("Kiện thất lạc, hủy vận đơn");
        when(ticketRepository.findById(1L)).thenReturn(Optional.of(sampleTicket));
        when(ticketRepository.save(any(SupportTicket.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ticketService.resolveTicket(1L, request);

        verify(shipmentClient).cancelShipment(eq("WB123456VN"), any(Map.class), eq("ROLE_CS"), eq("shipment:cancel_all"));
    }

    @Test
    void testResolveTicket_LateDeliveryDoesNotCancelWaybill() {
        sampleTicket.setCategory("LATE_DELIVERY");
        ResolveTicketRequest request = new ResolveTicketRequest();
        request.setResolutionNote("Giao trễ, không hủy đơn");
        when(ticketRepository.findById(1L)).thenReturn(Optional.of(sampleTicket));
        when(ticketRepository.save(any(SupportTicket.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ticketService.resolveTicket(1L, request);

        verify(shipmentClient, never()).cancelShipment(any(), any(), any(), any());
    }
}
