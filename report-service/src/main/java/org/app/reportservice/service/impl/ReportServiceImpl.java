package org.app.reportservice.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.app.reportservice.client.CustomerClient;
import org.app.reportservice.dto.CustomerValidationResponse;
import org.app.reportservice.dto.event.CreateShipmentEvent;
import org.app.reportservice.dto.event.ShipmentStatusUpdatedEvent;
import org.app.reportservice.entity.ReportShipmentSummary;
import org.app.reportservice.exception.ForbiddenException;
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
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReportServiceImpl implements ReportService {

    private static final Set<String> EARLY_STATUSES = Set.of("CREATED", "PENDING_ROUTING", "ROUTE_ASSIGNED");
    private static final List<String> MOVING_STATUSES = List.of(
            "CREATED", "PENDING_ROUTING", "ROUTE_ASSIGNED", "PICKED_UP",
            "IN_TRANSIT", "ARRIVED_DEST_HUB", "OUT_FOR_DELIVERY");
    private static final long UNASSIGNED_CUSTOMER_ID = 0L;

    private final ReportShipmentRepository reportShipmentRepository;
    private final ExcelExportService excelExportService;
    private final CustomerClient customerClient;

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
        if (event.getCustomerId() != null) {
            summary.setCustomerId(event.getCustomerId());
        } else if (summary.getCustomerId() == null) {
            summary.setCustomerId(UNASSIGNED_CUSTOMER_ID);
        }
        String existingStatus = summary.getCurrentStatus();
        if (existingStatus == null || existingStatus.isBlank() || EARLY_STATUSES.contains(existingStatus)) {
            summary.setCurrentStatus(event.getCurrentStatus() != null ? event.getCurrentStatus() : "PENDING_ROUTING");
        }
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

        LocalDateTime eventTime = event.getUpdatedAt() != null ? event.getUpdatedAt() : LocalDateTime.now();
        ReportShipmentSummary summary = reportShipmentRepository.findByTrackingCode(event.getTrackingCode())
                .orElseGet(() -> ReportShipmentSummary.builder()
                        .trackingCode(event.getTrackingCode())
                        .customerId(UNASSIGNED_CUSTOMER_ID)
                        .currentStatus(event.getStatus() != null && !event.getStatus().isBlank()
                                ? event.getStatus().trim() : "PENDING_ROUTING")
                        .shippingFee(BigDecimal.ZERO)
                        .codAmount(BigDecimal.ZERO)
                        .totalFee(BigDecimal.ZERO)
                        .codSettlementStatus("UNSETTLED")
                        .createdAt(eventTime)
                        .updatedAt(eventTime)
                        .build());

        boolean staleStatus = summary.getUpdatedAt() != null && event.getUpdatedAt() != null
                && event.getUpdatedAt().isBefore(summary.getUpdatedAt());
        if (!staleStatus && event.getStatus() != null && !event.getStatus().isBlank()) {
            summary.setCurrentStatus(event.getStatus().trim());
            if ("DELIVERED".equals(summary.getCurrentStatus()) || "RETURNED".equals(summary.getCurrentStatus())) {
                summary.setCompletedAt(eventTime);
            }
            summary.setUpdatedAt(eventTime);
        }
        if (event.getCodSettlementStatus() != null && !event.getCodSettlementStatus().isBlank()) {
            summary.setCodSettlementStatus(event.getCodSettlementStatus().trim());
        }
        reportShipmentRepository.save(summary);
    }

    private Long resolveCustomerId(Long requestCustomerId, String roles, String userId) {
        if (isOperationalStaff(roles)) {
            return requestCustomerId;
        }
        if (roles != null && roles.toUpperCase().contains("CUSTOMER")) {
            return customerIdForUser(userId);
        }
        throw new ForbiddenException("Không có quyền xem báo cáo.");
    }

    private boolean isOperationalStaff(String roles) {
        if (roles == null || roles.isBlank()) {
            return false;
        }
        String upper = roles.toUpperCase();
        return upper.contains("ADMIN")
                || upper.contains("CS")
                || upper.contains("DISPATCHER")
                || upper.contains("HUB")
                || upper.contains("POST_OFFICE")
                || upper.contains("SHIPPER");
    }

    private Long customerIdForUser(String userId) {
        if (userId == null || userId.isBlank()) {
            throw new ForbiddenException("Không xác định được hồ sơ khách hàng.");
        }
        long parsedUserId;
        try {
            parsedUserId = Long.parseLong(userId.trim());
        } catch (NumberFormatException ex) {
            throw new ForbiddenException("Không xác định được hồ sơ khách hàng.");
        }
        CustomerValidationResponse profile;
        try {
            profile = customerClient.validateByUserId(parsedUserId);
        } catch (Exception ex) {
            log.warn("[REPORT] Không phân giải được customerId cho user {}: {}", userId, ex.getMessage());
            throw new ForbiddenException("Không tìm thấy hồ sơ khách hàng gắn với tài khoản.");
        }
        if (profile == null || !profile.isValid() || profile.getCustomerId() == null) {
            throw new ForbiddenException("Không tìm thấy hồ sơ khách hàng gắn với tài khoản.");
        }
        return profile.getCustomerId();
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
        String statusFilter = normalizeStatus(status);
        BigDecimal sumFee = reportShipmentRepository.sumShippingFee(from, to, targetCustId, statusFilter);
        BigDecimal sumCod = reportShipmentRepository.sumCodAmount(from, to, targetCustId, statusFilter);
        BigDecimal settledCod = reportShipmentRepository.sumSettledCodAmount(from, to, targetCustId, statusFilter);
        BigDecimal pendingCod = reportShipmentRepository.sumPendingCodAmount(from, to, targetCustId, statusFilter);
        long totalOrders = reportShipmentRepository.countTotalOrders(from, to, targetCustId, statusFilter);
        long delivered = reportShipmentRepository.countByStatus(from, to, targetCustId, statusFilter, "DELIVERED");
        long returning = reportShipmentRepository.countByStatus(from, to, targetCustId, statusFilter, "RETURNING")
                + reportShipmentRepository.countByStatus(from, to, targetCustId, statusFilter, "RETURNED");
        long failed = reportShipmentRepository.countByStatus(from, to, targetCustId, statusFilter, "DELIVERY_FAILED");
        long cancelled = reportShipmentRepository.countByStatus(from, to, targetCustId, statusFilter, "CANCELLED");
        long inTransit = reportShipmentRepository.countInStatuses(from, to, targetCustId, statusFilter, MOVING_STATUSES);
        Page<ReportShipmentSummary> pageData = reportShipmentRepository.findByFilters(
                from, to, targetCustId, statusFilter, PageRequest.of(page, size)
        );
        Map<String, Object> res = new HashMap<>();
        res.put("totalOrders", totalOrders);
        res.put("tableTotalElements", pageData.getTotalElements());
        res.put("totalShippingFee", sumFee != null ? sumFee : BigDecimal.ZERO);
        res.put("totalCodAmount", sumCod != null ? sumCod : BigDecimal.ZERO);
        res.put("settledCodAmount", settledCod != null ? settledCod : BigDecimal.ZERO);
        res.put("pendingCodAmount", pendingCod != null ? pendingCod : BigDecimal.ZERO);
        res.put("deliveredCount", delivered);
        res.put("returningCount", returning);
        res.put("failedCount", failed);
        res.put("cancelledCount", cancelled);
        res.put("inTransitCount", inTransit);
        res.put("daily", buildDailySeries(from.toLocalDate(), to.toLocalDate(),
                reportShipmentRepository.sumByDay(from, to, targetCustId, statusFilter)));
        res.put("successRate", totalOrders > 0 ? Math.min(100.0, (delivered * 100.0 / totalOrders)) : 0.0);
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
        String statusFilter = normalizeStatus(status);
        List<ReportShipmentSummary> allData = reportShipmentRepository.findAllByFilters(from, to, targetCustId, statusFilter);
        BigDecimal sumFee = reportShipmentRepository.sumShippingFee(from, to, targetCustId, statusFilter);
        BigDecimal sumCod = reportShipmentRepository.sumCodAmount(from, to, targetCustId, statusFilter);
        BigDecimal settledCod = reportShipmentRepository.sumSettledCodAmount(from, to, targetCustId, statusFilter);
        BigDecimal pendingCod = reportShipmentRepository.sumPendingCodAmount(from, to, targetCustId, statusFilter);
        long delivered = reportShipmentRepository.countByStatus(from, to, targetCustId, statusFilter, "DELIVERED");
        long returning = reportShipmentRepository.countByStatus(from, to, targetCustId, statusFilter, "RETURNING")
                + reportShipmentRepository.countByStatus(from, to, targetCustId, statusFilter, "RETURNED");
        String rangeText = from.format(DateTimeFormatter.ofPattern("dd/MM/yyyy")) + " đến " +
                to.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        BigDecimal safeSumFee = sumFee != null ? sumFee : BigDecimal.ZERO;
        BigDecimal safeSumCod = sumCod != null ? sumCod : BigDecimal.ZERO;
        BigDecimal safeSettledCod = settledCod != null ? settledCod : BigDecimal.ZERO;
        BigDecimal safePendingCod = pendingCod != null ? pendingCod : BigDecimal.ZERO;
        return excelExportService.exportReportToExcel(allData, safeSumFee, safeSumCod, safeSettledCod, safePendingCod, delivered, returning, rangeText);
    }

    private String normalizeStatus(String status) {
        if (status == null || status.isBlank()) {
            return "ALL";
        }
        return status.trim();
    }

    private List<Map<String, Object>> buildDailySeries(LocalDate from, LocalDate to, List<Object[]> rows) {
        Map<LocalDate, Object[]> byDay = new HashMap<>();
        if (rows != null) {
            for (Object[] row : rows) {
                LocalDate day = LocalDate.of(
                        ((Number) row[0]).intValue(),
                        ((Number) row[1]).intValue(),
                        ((Number) row[2]).intValue());
                byDay.put(day, row);
            }
        }
        List<Map<String, Object>> series = new ArrayList<>();
        for (LocalDate cursor = from; !cursor.isAfter(to); cursor = cursor.plusDays(1)) {
            Object[] row = byDay.get(cursor);
            Map<String, Object> item = new HashMap<>();
            item.put("date", cursor.toString());
            item.put("shippingFee", row != null ? row[3] : BigDecimal.ZERO);
            item.put("codAmount", row != null ? row[4] : BigDecimal.ZERO);
            item.put("count", row != null ? ((Number) row[5]).longValue() : 0L);
            series.add(item);
        }
        return series;
    }
}
