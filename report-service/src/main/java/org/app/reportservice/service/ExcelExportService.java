package org.app.reportservice.service;

import org.app.reportservice.entity.ReportShipmentSummary;

import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public interface ExcelExportService {
    byte[] exportReportToExcel(List<ReportShipmentSummary> shipments, BigDecimal totalShippingFee,
                               BigDecimal totalCodAmount, BigDecimal settledCodAmount, BigDecimal pendingCodAmount,
                               long deliveredCount, long returningCount, String dateRangeText) throws IOException;

    default byte[] exportReportToExcel(List<ReportShipmentSummary> shipments, BigDecimal totalShippingFee,
                                       BigDecimal totalCodAmount, long deliveredCount, long returningCount, String dateRangeText) throws IOException {
        return exportReportToExcel(shipments, totalShippingFee, totalCodAmount, BigDecimal.ZERO, totalCodAmount, deliveredCount, returningCount, dateRangeText);
    }
}
