package org.app.reportservice.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.app.reportservice.dto.event.CreateShipmentEvent;
import org.app.reportservice.dto.event.ShipmentStatusUpdatedEvent;
import org.app.reportservice.entity.ReportShipmentSummary;
import org.app.reportservice.repository.ReportShipmentRepository;
import org.app.reportservice.service.ExcelExportService;
import org.app.reportservice.service.ReportService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReportServiceImpl implements ReportService {

    private final ReportShipmentRepository reportShipmentRepository;
    private final ExcelExportService excelExportService;

    @Override
    @Transactional
    public void processShipmentCreated(CreateShipmentEvent event) {
        if (event == null || event.getTrackingCode() == null) {
            log.warn("Đơn hàng không tồn tại: {}", event);
            return;
        }

        ReportShipmentSummary summary = reportShipmentRepository.findByTrackingCode(event.getTrackingCode())
                .orElseGet(() -> ReportShipmentSummary.builder().trackingCode(event.getTrackingCode())
                        .createdAt(LocalDateTime.now())
                        .build());
        summary.setCustomerId(event.getCustomerId());
        summary.setSenderName(event.getSenderName());
        summary.setSenderPhone(event.getSenderPhone());
        summary.setSenderAddress(event.getSenderAddress());
        summary.setReceiverName(event.getReceiverName());
        summary.setReceiverPhone(event.getReceiverPhone());
        summary.setReceiverAddress(event.getReceiverAddress());
        summary.setServiceType(event.getServiceType() != null ? event.getServiceType() : "EXPRESS");
        summary.setWeight(event.getWeight() != null ? event.getWeight() : 1.0);
        summary.setShippingFee(event.getShippingFee() != null ? event.getShippingFee() : BigDecimal.ZERO);
        summary.setCodAmount(event.getCodAmount() != null ? event.getCodAmount() : BigDecimal.ZERO);
        summary.setTotalFee(event.getTotalFee() != null ? event.getTotalFee() : summary.getShippingFee());
        summary.setCurrentStatus(event.getCurrentStatus() != null ? event.getCurrentStatus() : "PENDING_ROUTING");
        if (summary.getCodSettlementStatus() == null) {
            summary.setCodSettlementStatus("UNSETTLED");
        }
        summary.setUpdatedAt(LocalDateTime.now());
        reportShipmentRepository.save(summary);
    }

    @Override
    @Transactional
    public void processStatusUpdated(ShipmentStatusUpdatedEvent event) {
        if (event == null || event.getTrackingCode() == null) {
            log.warn("Đơn hàng không tồn tại: {}", event);
            return;
        }

        reportShipmentRepository.findByTrackingCode(event.getTrackingCode()).ifPresent(summary -> {
            if (event.getStatus() != null && !event.getStatus().isBlank()) {
                summary.setCurrentStatus(event.getStatus());
            }
            if (event.getCodSettlementStatus() != null && !event.getCodSettlementStatus().isBlank()) {
                summary.setCodSettlementStatus(event.getCodSettlementStatus());
            }
            summary.setUpdatedAt(LocalDateTime.now());

            if("DELIVERED".equals(event.getStatus()) || "RETURNED".equals(event.getStatus())) {
                summary.setCompletedAt(LocalDateTime.now());
            }
            reportShipmentRepository.save(summary);
        });

    }

    private Long resolveCustomerId(Long requestCustomerId, String roles, String userId) {
        boolean isAdminOrCs = roles != null && (roles.contains("ADMIN") || roles.contains("CS"));
        if (isAdminOrCs) {
            return requestCustomerId;
        }
        if (userId != null && !userId.isBlank()) {
            try {
                return Long.parseLong(userId.trim());
            } catch (NumberFormatException ignored) {
            }
        }
        return requestCustomerId;
    }

    private void validateDateRange(LocalDate fromDate, LocalDate toDate) {
        if (fromDate != null && toDate != null && fromDate.isAfter(toDate)) {
            throw new IllegalArgumentException("Ngày bắt đầu không được lớn hơn ngày kết thúc.");
        }
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> getReportSummary(LocalDate fromDate, LocalDate toDate, Long customerId, String status, int page, int size, String roles, String userId) {
        validateDateRange(fromDate, toDate);
        LocalDateTime from = (fromDate != null ? fromDate : LocalDate.now().minusDays(7)).atStartOfDay();
        LocalDateTime to = (toDate != null ? toDate : LocalDate.now()).atTime(LocalTime.MAX);
        Long targetCustId = resolveCustomerId(customerId, roles, userId);
        BigDecimal sumFee = reportShipmentRepository.sumShippingFee(from, to, targetCustId);
        BigDecimal sumCod = reportShipmentRepository.sumCodAmount(from, to, targetCustId);
        BigDecimal settledCod = reportShipmentRepository.sumSettledCodAmount(from, to, targetCustId);
        BigDecimal pendingCod = reportShipmentRepository.sumPendingCodAmount(from, to, targetCustId);
        long delivered = reportShipmentRepository.countByStatus(from, to, targetCustId, "DELIVERED");
        long returning = reportShipmentRepository.countByStatus(from, to, targetCustId, "RETURNING") +
                reportShipmentRepository.countByStatus(from, to, targetCustId, "RETURNED");
        Page<ReportShipmentSummary> pageData = reportShipmentRepository.findByFilters(
                from, to, targetCustId, status, PageRequest.of(page, size)
        );
        Map<String, Object> res = new HashMap<>();
        res.put("totalOrders", pageData.getTotalElements());
        res.put("totalShippingFee", sumFee != null ? sumFee : BigDecimal.ZERO);
        res.put("totalCodAmount", sumCod != null ? sumCod : BigDecimal.ZERO);
        res.put("settledCodAmount", settledCod != null ? settledCod : BigDecimal.ZERO);
        res.put("pendingCodAmount", pendingCod != null ? pendingCod : BigDecimal.ZERO);
        res.put("deliveredCount", delivered);
        res.put("returningCount", returning);
        res.put("successRate", pageData.getTotalElements() > 0 ? (delivered * 100.0 / pageData.getTotalElements()) : 0.0);
        res.put("shipments", pageData.getContent());
        res.put("totalPages", pageData.getTotalPages());
        res.put("currentPage", page);
        return res;
    }

    @Override
    @Transactional(readOnly = true)
    public byte[] exportReportToExcel(LocalDate fromDate, LocalDate toDate, Long customerId, String status, String roles, String userId) throws IOException {
        validateDateRange(fromDate, toDate);
        LocalDateTime from = (fromDate != null ? fromDate : LocalDate.now().minusDays(7)).atStartOfDay();
        LocalDateTime to = (toDate != null ? toDate : LocalDate.now()).atTime(LocalTime.MAX);
        Long targetCustId = resolveCustomerId(customerId, roles, userId);
        List<ReportShipmentSummary> allData = reportShipmentRepository.findAllByFilters(from, to, targetCustId, status);
        BigDecimal sumFee = reportShipmentRepository.sumShippingFee(from, to, targetCustId);
        BigDecimal sumCod = reportShipmentRepository.sumCodAmount(from, to, targetCustId);
        BigDecimal settledCod = reportShipmentRepository.sumSettledCodAmount(from, to, targetCustId);
        BigDecimal pendingCod = reportShipmentRepository.sumPendingCodAmount(from, to, targetCustId);
        long delivered = reportShipmentRepository.countByStatus(from, to, targetCustId, "DELIVERED");
        long returning = reportShipmentRepository.countByStatus(from, to, targetCustId, "RETURNING") +
                reportShipmentRepository.countByStatus(from, to, targetCustId, "RETURNED");
        String rangeText = from.format(DateTimeFormatter.ofPattern("dd/MM/yyyy")) + " đến " +
                to.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        BigDecimal safeSumFee = sumFee != null ? sumFee : BigDecimal.ZERO;
        BigDecimal safeSumCod = sumCod != null ? sumCod : BigDecimal.ZERO;
        BigDecimal safeSettledCod = settledCod != null ? settledCod : BigDecimal.ZERO;
        BigDecimal safePendingCod = pendingCod != null ? pendingCod : BigDecimal.ZERO;
        return excelExportService.exportReportToExcel(allData, safeSumFee, safeSumCod, safeSettledCod, safePendingCod, delivered, returning, rangeText);
    }
}
