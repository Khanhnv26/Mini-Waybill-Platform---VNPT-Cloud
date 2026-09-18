package org.app.reportservice.exception;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalArgumentException(IllegalArgumentException ex) {
        log.warn("[REPORT-SERVICE] Tham số không hợp lệ: {}", ex.getMessage());
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("errorCode", "INVALID_ARGUMENT");
        body.put("message", ex.getMessage());
        body.put("status", HttpStatus.BAD_REQUEST.value());
        body.put("timestamp", LocalDateTime.now().toString());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<Map<String, Object>> handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
        String paramName = ex.getName();
        String message = String.format("Định dạng tham số '%s' không hợp lệ: '%s'", paramName, ex.getValue());
        log.warn("[REPORT-SERVICE] Lỗi kiểu dữ liệu tham số: {}", message);
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("errorCode", "TYPE_MISMATCH");
        body.put("message", message);
        body.put("status", HttpStatus.BAD_REQUEST.value());
        body.put("timestamp", LocalDateTime.now().toString());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
    }

    @ExceptionHandler(IOException.class)
    public ResponseEntity<Map<String, Object>> handleIOException(IOException ex) {
        log.error("[REPORT-SERVICE] Sự cố I/O khi xử lý xuất file Excel: ", ex);
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("errorCode", "EXCEL_EXPORT_ERROR");
        body.put("message", "Đã xảy ra lỗi khi tạo hoặc truyền luồng file Excel: " + ex.getMessage());
        body.put("status", HttpStatus.INTERNAL_SERVER_ERROR.value());
        body.put("timestamp", LocalDateTime.now().toString());
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(body);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGeneralException(Exception ex) {
        log.error("[REPORT-SERVICE] Lỗi hệ thống không lường trước: ", ex);
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("errorCode", "INTERNAL_SERVER_ERROR");
        body.put("message", "Lỗi xử lý nội bộ tại report-service: " + ex.getMessage());
        body.put("status", HttpStatus.INTERNAL_SERVER_ERROR.value());
        body.put("timestamp", LocalDateTime.now().toString());
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(body);
    }
}
