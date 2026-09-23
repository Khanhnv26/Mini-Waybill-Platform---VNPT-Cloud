package org.app.supportservice.exception;

import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {


    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleResourceNotFound(ResourceNotFoundException ex) {
        log.warn("[SUPPORT-SERVICE] Resource not found: {}", ex.getMessage());
        Map<String, Object> error = new HashMap<>();
        error.put("errorCode", "TICKET_NOT_FOUND");
        error.put("message", ex.getMessage());
        error.put("timestamp", LocalDateTime.now().toString());
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
    }


    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidationException(MethodArgumentNotValidException ex) {
        Map<String, Object> response = new HashMap<>();
        Map<String, String> fieldErrors = new HashMap<>();

        for (FieldError fieldError : ex.getBindingResult().getFieldErrors()) {
            fieldErrors.put(fieldError.getField(), fieldError.getDefaultMessage());
        }

        response.put("errorCode", "VALIDATION_ERROR");
        response.put("message", "Dữ liệu gửi lên không hợp lệ");
        response.put("errors", fieldErrors);
        response.put("timestamp", LocalDateTime.now().toString());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }


    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, Object>> handleDataIntegrityViolation(DataIntegrityViolationException ex) {
        log.warn("[SUPPORT-SERVICE] Data integrity violation: {}", ex.getMessage());
        Map<String, Object> error = new HashMap<>();
        error.put("errorCode", "DATA_INTEGRITY_VIOLATION");
        error.put("message", "Lỗi ràng buộc dữ liệu hoặc mã vé đã tồn tại trong hệ thống");
        error.put("timestamp", LocalDateTime.now().toString());
        return ResponseEntity.status(HttpStatus.CONFLICT).body(error);
    }


    @ExceptionHandler(BadRequestException.class)
    public ResponseEntity<Map<String, Object>> handleBadRequest(BadRequestException ex) {
        log.warn("[SUPPORT-SERVICE] Bad request: {}", ex.getMessage());
        Map<String, Object> error = new HashMap<>();
        error.put("errorCode", "BAD_REQUEST");
        error.put("message", ex.getMessage());
        error.put("timestamp", LocalDateTime.now().toString());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }


    @ExceptionHandler(AiUnavailableException.class)
    public ResponseEntity<Map<String, Object>> handleAiUnavailable(AiUnavailableException ex) {
        log.error("[SUPPORT-SERVICE] AI unavailable: {}", ex.getMessage(), ex);
        Map<String, Object> error = new HashMap<>();
        error.put("errorCode", "AI_UNAVAILABLE");
        error.put("message", "Hệ thống trợ lý đang bận. Quý khách vui lòng thử lại sau hoặc gửi yêu cầu tại mục Hỗ trợ khiếu nại.");
        error.put("timestamp", LocalDateTime.now().toString());
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(error);
    }


    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Map<String, Object>> handleRuntimeException(RuntimeException ex) {
        log.error("[SUPPORT-SERVICE] Runtime exception: {}", ex.getMessage(), ex);
        Map<String, Object> error = new HashMap<>();
        error.put("errorCode", "BUSINESS_ERROR");
        error.put("message", ex.getMessage());
        error.put("timestamp", LocalDateTime.now().toString());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }


    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGlobalException(Exception ex) {
        log.error("[SUPPORT-SERVICE] Unexpected error: {}", ex.getMessage(), ex);
        Map<String, Object> error = new HashMap<>();
        error.put("errorCode", "INTERNAL_SERVER_ERROR");
        error.put("message", "Hệ thống gặp sự cố tạm thời. Vui lòng thử lại sau!");
        error.put("timestamp", LocalDateTime.now().toString());
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
    }
}
