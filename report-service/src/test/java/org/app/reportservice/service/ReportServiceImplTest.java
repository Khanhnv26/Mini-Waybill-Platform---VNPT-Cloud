package org.app.reportservice.service;

import org.app.reportservice.client.CustomerClient;
import org.app.reportservice.dto.CustomerValidationResponse;
import org.app.reportservice.dto.event.CreateShipmentEvent;
import org.app.reportservice.dto.event.ShipmentStatusUpdatedEvent;
import org.app.reportservice.entity.ReportShipmentSummary;
import org.app.reportservice.exception.ForbiddenException;
import org.app.reportservice.repository.ReportShipmentRepository;
import org.app.reportservice.service.impl.ReportServiceImpl;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReportServiceImplTest {

    @Mock
    private ReportShipmentRepository reportShipmentRepository;

    @Mock
    private ExcelExportService excelExportService;

    @Mock
    private CustomerClient customerClient;

    @InjectMocks
    private ReportServiceImpl reportService;

    @Test
    @DisplayName("Event cũ không kéo đơn đã giao về đang vận chuyển")
    void processStatusUpdated_staleEvent_keepsDelivered() {
        ReportShipmentSummary existing = ReportShipmentSummary.builder()
                .trackingCode("WB1")
                .customerId(8L)
                .currentStatus("DELIVERED")
                .updatedAt(LocalDateTime.now())
                .build();
        when(reportShipmentRepository.findByTrackingCode("WB1")).thenReturn(Optional.of(existing));
        when(reportShipmentRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        reportService.processStatusUpdated(ShipmentStatusUpdatedEvent.builder()
                .trackingCode("WB1")
                .status("IN_TRANSIT")
                .updatedAt(LocalDateTime.now().minusHours(2))
                .build());

        assertEquals("DELIVERED", existing.getCurrentStatus());
    }

    @Test
    @DisplayName("Tạo đơn sau event trạng thái không hạ trạng thái đã đi")
    void processShipmentCreated_keepsStatusRecordedEarlier() {
        ReportShipmentSummary existing = ReportShipmentSummary.builder()
                .trackingCode("WB2")
                .customerId(0L)
                .currentStatus("IN_TRANSIT")
                .createdAt(LocalDateTime.now().minusMinutes(5))
                .updatedAt(LocalDateTime.now().minusMinutes(5))
                .build();
        when(reportShipmentRepository.findByTrackingCode("WB2")).thenReturn(Optional.of(existing));
        when(reportShipmentRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        reportService.processShipmentCreated(CreateShipmentEvent.builder()
                .trackingCode("WB2")
                .customerId(15L)
                .senderName("An")
                .currentStatus("PENDING_ROUTING")
                .shippingFee(BigDecimal.TEN)
                .build());

        assertEquals("IN_TRANSIT", existing.getCurrentStatus());
        assertEquals(15L, existing.getCustomerId());
        assertEquals("An", existing.getSenderName());
    }

    @Test
    @DisplayName("Khách hàng không được xem báo cáo của customerId khác")
    void getReportSummary_customerRole_ignoresRequestedCustomerId() {
        CustomerValidationResponse profile = new CustomerValidationResponse();
        profile.setValid(true);
        profile.setCustomerId(8L);
        when(customerClient.validateByUserId(5L)).thenReturn(profile);
        when(reportShipmentRepository.sumShippingFee(any(), any(), eq(8L), eq("ALL"))).thenReturn(BigDecimal.ZERO);
        when(reportShipmentRepository.sumCodAmount(any(), any(), eq(8L), eq("ALL"))).thenReturn(BigDecimal.ZERO);
        when(reportShipmentRepository.sumSettledCodAmount(any(), any(), eq(8L), eq("ALL"))).thenReturn(BigDecimal.ZERO);
        when(reportShipmentRepository.sumPendingCodAmount(any(), any(), eq(8L), eq("ALL"))).thenReturn(BigDecimal.ZERO);
        when(reportShipmentRepository.countTotalOrders(any(), any(), eq(8L), eq("ALL"))).thenReturn(0L);
        when(reportShipmentRepository.countByStatus(any(), any(), eq(8L), eq("ALL"), any())).thenReturn(0L);
        when(reportShipmentRepository.countInStatuses(any(), any(), eq(8L), eq("ALL"), any())).thenReturn(0L);
        when(reportShipmentRepository.sumByDay(any(), any(), eq(8L), eq("ALL"))).thenReturn(java.util.List.of());
        when(reportShipmentRepository.findByFilters(any(), any(), eq(8L), eq("ALL"), any()))
                .thenReturn(org.springframework.data.domain.Page.empty());

        reportService.getReportSummary(LocalDate.now().minusDays(1), LocalDate.now(), 99L, "ALL", 0, 10, "ROLE_CUSTOMER", "5");

        verify(reportShipmentRepository).countTotalOrders(any(), any(), eq(8L), eq("ALL"));
    }

    @Test
    @DisplayName("Không có vai trò thì không xem báo cáo")
    void getReportSummary_withoutRole_isForbidden() {
        assertThrows(ForbiddenException.class, () -> reportService.getReportSummary(
                LocalDate.now(), LocalDate.now(), null, "ALL", 0, 10, null, null));
    }
}
