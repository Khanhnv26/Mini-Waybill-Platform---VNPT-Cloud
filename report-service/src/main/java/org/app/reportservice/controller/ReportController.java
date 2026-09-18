package org.app.reportservice.controller;


import lombok.RequiredArgsConstructor;
import org.app.reportservice.service.ReportService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.io.IOException;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Map;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ReportService reportService;

    @GetMapping("/summary")
    public ResponseEntity<Map<String, Object>> getSummary(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(required = false) Long customerId,
            @RequestParam(required = false, defaultValue = "ALL") String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestHeader(value = "X-User-Roles", required = false) String roles,
            @RequestHeader(value = "X-User-Id", required = false) String userId
    ) {
        return ResponseEntity.ok(reportService.getReportSummary(fromDate, toDate, customerId, status, page, size, roles, userId));
    }
    @GetMapping("/export")
    public ResponseEntity<byte[]> exportExcel(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(required = false) Long customerId,
            @RequestParam(required = false, defaultValue = "ALL") String status,
            @RequestHeader(value = "X-User-Roles", required = false) String roles,
            @RequestHeader(value = "X-User-Id", required = false) String userId
    ) throws IOException {
        byte[] fileBytes = reportService.exportReportToExcel(fromDate, toDate, customerId, status, roles, userId);
        String filename = "VNPT_BaoCao_VanDon_" + LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd")) + ".xlsx";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + filename)
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(fileBytes);
    }
}
