package org.app.reportservice.service.impl;

import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.streaming.SXSSFSheet;
import org.apache.poi.xssf.streaming.SXSSFWorkbook;
import org.app.reportservice.entity.ReportShipmentSummary;
import org.app.reportservice.service.ExcelExportService;
import org.springframework.stereotype.Service;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ExcelExportServiceImpl implements ExcelExportService {

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    @Override
    public byte[] exportReportToExcel(List<ReportShipmentSummary> shipments, BigDecimal totalShippingFee, BigDecimal totalCodAmount, BigDecimal settledCodAmount, BigDecimal pendingCodAmount, long deliveredCount, long returningCount, String dateRangeText) throws IOException {
        try (SXSSFWorkbook workbook = new SXSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            CellStyle headerStyle = createHeaderCellStyle(workbook, IndexedColors.DARK_BLUE.getIndex());
            CellStyle subHeaderStyle = createHeaderCellStyle(workbook, IndexedColors.ROYAL_BLUE.getIndex());
            CellStyle currencyStyle = createCurrencyStyle(workbook);
            CellStyle centerStyle = createCenterStyle(workbook);
            CellStyle boldCurrencyStyle = createBoldCurrencyStyle(workbook);
            CellStyle totalRowStyle = createTotalRowStyle(workbook);
            CellStyle totalLabelStyle = createTotalLabelStyle(workbook);

            SXSSFSheet sheet1 = workbook.createSheet("Tổng Hợp & Đối Soát COD");
            sheet1.trackAllColumnsForAutoSizing();

            Row titleRow = sheet1.createRow(1);
            Cell titleCell = titleRow.createCell(1);
            titleCell.setCellValue("TỔNG CÔNG TY DỊCH VỤ VIỄN THÔNG & BƯU CHÍNH VNPT");
            CellStyle mainTitleStyle = workbook.createCellStyle();
            Font font = workbook.createFont();
            font.setBold(true);
            font.setFontHeightInPoints((short) 14);
            font.setColor(IndexedColors.DARK_BLUE.getIndex());
            mainTitleStyle.setFont(font);
            titleCell.setCellStyle(mainTitleStyle);
            Row subTitleRow = sheet1.createRow(2);
            Cell subTitleCell = subTitleRow.createCell(1);
            subTitleCell.setCellValue("BÁO CÁO TỔNG HỢP VẬN ĐƠN & ĐỐI SOÁT DÒNG TIỀN COD");

            Row periodRow = sheet1.createRow(3);
            periodRow.createCell(1).setCellValue("Kỳ báo cáo: " + dateRangeText + " | Hệ thống: VNPT Waybill Platform");

            int r = 5;
            Row kpiHeader = sheet1.createRow(r++);
            kpiHeader.createCell(1).setCellValue("CHỈ SỐ ĐỐI SOÁT (KPI)");
            kpiHeader.createCell(2).setCellValue("GIÁ TRỊ THỐNG KÊ");
            kpiHeader.createCell(3).setCellValue("ĐƠN VỊ TÍNH");
            kpiHeader.createCell(4).setCellValue("GHI CHÚ NGHIỆP VỤ");
            for (int col = 1; col <= 4; col++) {
                kpiHeader.getCell(col).setCellStyle(subHeaderStyle);
            }
            long totalOrders = shipments.size();
            double successRate = totalOrders > 0 ? (deliveredCount * 100.0 / totalOrders) : 0.0;
            addKpiRow(sheet1, r++, "1. Tổng sản lượng vận đơn phát sinh", String.format("%,d", totalOrders), "Kiện bưu gửi", "Bao gồm cả đơn B2B và quầy", centerStyle);
            addKpiRow(sheet1, r++, "2. Số đơn giao thành công (DELIVERED)", String.format("%,d", deliveredCount), String.format("%.1f%%", successRate), "Khách đã nhận hàng & thu tiền", centerStyle);
            addKpiRow(sheet1, r++, "3. Số đơn chuyển hoàn (RETURNING / RETURNED)", String.format("%,d", returningCount), String.format("%.1f%%", (totalOrders > 0 ? (returningCount * 100.0 / totalOrders) : 0)), "Chuyển hoàn sau 3 lần phát thất bại", centerStyle);

            double safeShippingFee = (totalShippingFee != null) ? totalShippingFee.doubleValue() : 0.0;
            double safeCodAmount = (totalCodAmount != null) ? totalCodAmount.doubleValue() : 0.0;
            double safeSettledCod = (settledCodAmount != null) ? settledCodAmount.doubleValue() : 0.0;
            double safePendingCod = (pendingCodAmount != null) ? pendingCodAmount.doubleValue() : 0.0;
            double safeTotalFee = safeShippingFee + safeCodAmount;

            Row feeRow = sheet1.createRow(r++);
            feeRow.createCell(1).setCellValue("4. Tổng Doanh Thu Cước Phí Vận Chuyển");
            Cell feeVal = feeRow.createCell(2);
            feeVal.setCellValue(safeShippingFee);
            feeVal.setCellStyle(boldCurrencyStyle);
            feeRow.createCell(3).setCellValue("VNĐ");
            feeRow.createCell(4).setCellValue("Doanh thu cước dịch vụ chuyển phát");

            Row codRow = sheet1.createRow(r++);
            codRow.createCell(1).setCellValue("5. TỔNG TIỀN THU HỘ COD PHẢI ĐỐI SOÁT");
            Cell codVal = codRow.createCell(2);
            codVal.setCellValue(safeCodAmount);
            codVal.setCellStyle(boldCurrencyStyle);
            codRow.createCell(3).setCellValue("VNĐ");
            codRow.createCell(4).setCellValue("Tiền thu hộ nộp về tài khoản quỹ trạm");

            addKpiRow(sheet1, r++, "  5.1. Tiền COD đã thu quỹ bưu cục", String.format("%,.0f", safeSettledCod), "VNĐ", "Đã nộp và thủ quỹ đã xác nhận vào két", centerStyle);
            addKpiRow(sheet1, r++, "  5.2. Tiền COD bưu tá đang giữ / chờ nộp", String.format("%,.0f", safePendingCod), "VNĐ", "Bưu tá đã thu từ người nhận, chưa hoàn tất nộp quỹ", centerStyle);

            for (int i = 1; i <= 4; i++) {
                sheet1.autoSizeColumn(i);
            }
            SXSSFSheet sheet2 = workbook.createSheet("Chi Tiết Vận Đơn");
            sheet2.trackAllColumnsForAutoSizing();
            Row hRow = sheet2.createRow(0);
            String[] headers = {
                    "STT", "Mã Vận Đơn", "Ngày Tạo", "Mã Khách Hàng", "Người Gửi", "Địa Chỉ Gửi",
                    "Người Nhận", "Địa Chỉ Phát", "Dịch Vụ", "Khối Lượng (kg)",
                    "Cước Phí (VNĐ)", "Tiền COD (VNĐ)", "Tổng Phí (VNĐ)", "Trạng Thái", "Tình Trạng Nộp Quỹ COD"
            };
            for (int i = 0; i < headers.length; i++) {
                Cell c = hRow.createCell(i);
                c.setCellValue(headers[i]);
                c.setCellStyle(headerStyle);
            }
            int rowIdx = 1;
            int stt = 1;
            for (ReportShipmentSummary s : shipments) {
                Row row = sheet2.createRow(rowIdx++);
                row.createCell(0).setCellValue(stt++);
                row.createCell(1).setCellValue(s.getTrackingCode());
                row.createCell(2).setCellValue(s.getCreatedAt() != null ? s.getCreatedAt().format(DATE_FMT) : "");
                row.createCell(3).setCellValue(s.getCustomerId() != null ? s.getCustomerId().toString() : "");
                row.createCell(4).setCellValue(s.getSenderName());
                row.createCell(5).setCellValue(s.getSenderAddress());
                row.createCell(6).setCellValue(s.getReceiverName());
                row.createCell(7).setCellValue(s.getReceiverAddress());
                row.createCell(8).setCellValue(s.getServiceType());
                row.createCell(9).setCellValue(s.getWeight() != null ? s.getWeight() : 0.0);
                Cell cFee = row.createCell(10);
                cFee.setCellValue(s.getShippingFee() != null ? s.getShippingFee().doubleValue() : 0.0);
                cFee.setCellStyle(currencyStyle);
                Cell cCod = row.createCell(11);
                cCod.setCellValue(s.getCodAmount() != null ? s.getCodAmount().doubleValue() : 0.0);
                cCod.setCellStyle(currencyStyle);
                Cell cTotal = row.createCell(12);
                cTotal.setCellValue(s.getTotalFee() != null ? s.getTotalFee().doubleValue() : 0.0);
                cTotal.setCellStyle(currencyStyle);
                row.createCell(13).setCellValue(s.getCurrentStatus());

                String codStatusText = "Chưa Nộp Quỹ";
                if ("SETTLED".equalsIgnoreCase(s.getCodSettlementStatus())) {
                    codStatusText = "Đã Nộp Quỹ Bưu Cục";
                } else if ("PENDING_SETTLEMENT".equalsIgnoreCase(s.getCodSettlementStatus())) {
                    codStatusText = "Chờ Bưu Cục Xác Nhận";
                }
                row.createCell(14).setCellValue(codStatusText);
            }

            double sumTotalFee = shipments.stream()
                    .mapToDouble(s -> s.getTotalFee() != null ? s.getTotalFee().doubleValue() : (s.getShippingFee() != null ? s.getShippingFee().doubleValue() : 0.0))
                    .sum();

            Row totalRow = sheet2.createRow(rowIdx);
            for (int col = 0; col <= 9; col++) {
                Cell c = totalRow.createCell(col);
                c.setCellStyle(totalLabelStyle);
            }
            Cell totalLabelCell = totalRow.getCell(0);
            totalLabelCell.setCellValue("TỔNG CỘNG (" + shipments.size() + " ĐƠN)");
            sheet2.addMergedRegion(new CellRangeAddress(rowIdx, rowIdx, 0, 9));

            Cell sumFeeCell = totalRow.createCell(10);
            sumFeeCell.setCellValue(safeShippingFee);
            sumFeeCell.setCellStyle(totalRowStyle);
            Cell sumCodCell = totalRow.createCell(11);
            sumCodCell.setCellValue(safeCodAmount);
            sumCodCell.setCellStyle(totalRowStyle);
            Cell sumTotalCell = totalRow.createCell(12);
            sumTotalCell.setCellValue(sumTotalFee);
            sumTotalCell.setCellStyle(totalRowStyle);
            Cell emptyCell13 = totalRow.createCell(13);
            emptyCell13.setCellValue("-");
            emptyCell13.setCellStyle(totalLabelStyle);
            Cell emptyCell14 = totalRow.createCell(14);
            emptyCell14.setCellValue("-");
            emptyCell14.setCellStyle(totalLabelStyle);
            for (int i = 0; i < headers.length; i++) {
                sheet2.autoSizeColumn(i);
                int currentWidth = sheet2.getColumnWidth(i);
                if (currentWidth < 3500) {
                    sheet2.setColumnWidth(i, 3500);
                }
            }
            workbook.write(out);
            return out.toByteArray();
        }
    }

    private void addKpiRow(Sheet sheet, int r, String name, String val, String unit,
                           String note, CellStyle centerStyle) {
        Row row = sheet.createRow(r);
        row.createCell(1).setCellValue(name);
        Cell v = row.createCell(2);
        v.setCellValue(val);
        v.setCellStyle(centerStyle);
        Cell u = row.createCell(3);
        u.setCellValue(unit);
        u.setCellStyle(centerStyle);
        row.createCell(4).setCellValue(note);
    }

    private CellStyle createHeaderCellStyle(Workbook wb, short bgColor) {
        CellStyle style = wb.createCellStyle();
        style.setFillForegroundColor(bgColor);
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        Font f = wb.createFont();
        f.setBold(true);
        f.setColor(IndexedColors.WHITE.getIndex());
        style.setFont(f);
        style.setAlignment(HorizontalAlignment.CENTER);
        setBorders(style);
        return style;
    }

    private void setBorders(CellStyle style) {
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);
    }

    private CellStyle createCurrencyStyle(Workbook wb) {
        CellStyle style = wb.createCellStyle();
        DataFormat format = wb.createDataFormat();
        style.setDataFormat(format.getFormat("#,##0 \"VNĐ\""));
        style.setAlignment(HorizontalAlignment.RIGHT);
        setBorders(style);
        return style;
    }

    private CellStyle createBoldCurrencyStyle(Workbook wb) {
        CellStyle style = createCurrencyStyle(wb);
        Font f = wb.createFont();
        f.setBold(true);
        style.setFont(f);
        return style;
    }

    private CellStyle createCenterStyle(Workbook wb) {
        CellStyle style = wb.createCellStyle();
        style.setAlignment(HorizontalAlignment.CENTER);
        setBorders(style);
        return style;
    }

    private CellStyle createTotalRowStyle(Workbook wb) {
        CellStyle style = wb.createCellStyle();
        style.setFillForegroundColor(IndexedColors.LIGHT_YELLOW.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        Font f = wb.createFont();
        style.setFont(f);
        DataFormat format = wb.createDataFormat();
        style.setDataFormat(format.getFormat("#,##0 \"VNĐ\""));
        style.setAlignment(HorizontalAlignment.RIGHT);
        setBorders(style);
        return style;
    }

    private CellStyle createTotalLabelStyle(Workbook wb) {
        CellStyle style = wb.createCellStyle();
        style.setFillForegroundColor(IndexedColors.LIGHT_YELLOW.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        Font f = wb.createFont();
        f.setBold(true);
        style.setFont(f);
        style.setAlignment(HorizontalAlignment.CENTER);
        setBorders(style);
        return style;
    }
}
