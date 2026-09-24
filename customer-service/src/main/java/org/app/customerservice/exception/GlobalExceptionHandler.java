package org.app.customerservice.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Map<String,String>> handleRuntimeException (RuntimeException ex) {
        Map<String,String> error = new HashMap<>();
        error.put("error",ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }

    @ExceptionHandler(org.springframework.dao.DataIntegrityViolationException.class)
    public ResponseEntity<Map<String,String>> handleDataIntegrityViolationException(org.springframework.dao.DataIntegrityViolationException ex) {
        Map<String,String> error = new HashMap<>();
        // Hibernate gắn nguyên câu INSERT vào getMessage(), và câu đó luôn có cột customer_code.
        // Chỉ đọc lỗi gốc của SQL Server để khỏi báo nhầm mọi trùng lặp thành trùng mã khách hàng.
        Throwable root = ex.getMostSpecificCause();
        error.put("error", resolveConstraintMessage(root != null ? root.getMessage() : ex.getMessage()));
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }

    static String resolveConstraintMessage(String rootMessage) {
        if (rootMessage == null || rootMessage.isBlank()) {
            return "Lỗi ràng buộc dữ liệu";
        }
        String lower = rootMessage.toLowerCase();
        boolean duplicate = lower.contains("unique") || lower.contains("duplicate");
        if (!duplicate) {
            return "Lỗi ràng buộc dữ liệu: " + rootMessage;
        }
        if (lower.contains("phone")) {
            return "Số điện thoại này đã thuộc về một khách hàng khác";
        }
        if (lower.contains("user_id")) {
            return "Tài khoản này đã được gắn với một khách hàng khác";
        }
        String duplicateValue = extractDuplicateValue(rootMessage);
        if (duplicateValue != null && duplicateValue.contains("@")) {
            return "Email này đã được đăng ký cho một khách hàng khác";
        }
        if (lower.contains("customer_code") || (duplicateValue != null && duplicateValue.toUpperCase().startsWith("CUST"))) {
            return "Mã khách hàng này đã tồn tại trong hệ thống";
        }
        return "Dữ liệu bị trùng (mã khách hàng, email hoặc số điện thoại đã tồn tại)";
    }

    private static String extractDuplicateValue(String rootMessage) {
        String marker = "duplicate key value is (";
        int start = rootMessage.toLowerCase().indexOf(marker);
        if (start < 0) {
            return null;
        }
        start += marker.length();
        int end = rootMessage.indexOf(')', start);
        if (end < 0) {
            return null;
        }
        return rootMessage.substring(start, end).trim();
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String,String>> handleValidateException(MethodArgumentNotValidException ex) {
        Map<String,String> errors = new HashMap<>();
        ex.getBindingResult().getFieldErrors().forEach(error -> errors.put(error.getField(),error.getDefaultMessage()));
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errors);
    }
}
