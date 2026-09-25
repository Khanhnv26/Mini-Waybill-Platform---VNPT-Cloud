package org.app.ratingservice.exception;

import feign.FeignException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, Object>> handleResponseStatusException(ResponseStatusException ex) {
        log.warn("[RATING-SERVICE] Response status error: {} - {}", ex.getStatusCode(), ex.getReason());
        Map<String, Object> error = new HashMap<>();
        error.put("errorCode", "RATING_" + ex.getStatusCode().value());
        error.put("message", ex.getReason() != null ? ex.getReason() : ex.getMessage());
        error.put("timestamp", LocalDateTime.now().toString());
        return ResponseEntity.status(ex.getStatusCode()).body(error);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidationException(MethodArgumentNotValidException ex) {
        log.warn("[RATING-SERVICE] Validation failed: {}", ex.getMessage());
        Map<String, Object> response = new HashMap<>();
        Map<String, String> fieldErrors = new HashMap<>();

        for (FieldError fieldError : ex.getBindingResult().getFieldErrors()) {
            fieldErrors.put(fieldError.getField(), fieldError.getDefaultMessage());
        }

        response.put("errorCode", "VALIDATION_ERROR");
        response.put("message", "Dữ liệu đánh giá gửi lên không hợp lệ");
        response.put("errors", fieldErrors);
        response.put("timestamp", LocalDateTime.now().toString());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, Object>> handleDataIntegrityViolation(DataIntegrityViolationException ex) {
        log.warn("[RATING-SERVICE] Data integrity violation: {}", ex.getMessage());
        Map<String, Object> error = new HashMap<>();
        error.put("errorCode", "SHIPMENT_ALREADY_RATED");
        error.put("message", "Bưu gửi này đã được ghi nhận đánh giá trong hệ thống.");
        error.put("timestamp", LocalDateTime.now().toString());
        return ResponseEntity.status(HttpStatus.CONFLICT).body(error);
    }

    @ExceptionHandler(FeignException.NotFound.class)
    public ResponseEntity<Map<String, Object>> handleFeignNotFound(FeignException.NotFound ex) {
        log.warn("[RATING-SERVICE] Feign not found from remote service: {}", ex.getMessage());
        Map<String, Object> error = new HashMap<>();
        error.put("errorCode", "SHIPMENT_NOT_FOUND");
        error.put("message", "Không tìm thấy thông tin bưu gửi từ dịch vụ vận đơn.");
        error.put("timestamp", LocalDateTime.now().toString());
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
    }

    @ExceptionHandler(FeignException.class)
    public ResponseEntity<Map<String, Object>> handleFeignException(FeignException ex) {
        log.error("[RATING-SERVICE] Feign communication error: status={}, message={}", ex.status(), ex.getMessage());
        Map<String, Object> error = new HashMap<>();
        error.put("errorCode", "REMOTE_SERVICE_ERROR");
        error.put("message", "Dịch vụ vận chuyển tạm thời gián đoạn. Vui lòng thử lại sau.");
        error.put("timestamp", LocalDateTime.now().toString());
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(error);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGeneralException(Exception ex) {
        log.error("[RATING-SERVICE] Unexpected server error: ", ex);
        Map<String, Object> error = new HashMap<>();
        error.put("errorCode", "INTERNAL_SERVER_ERROR");
        error.put("message", "Đã xảy ra lỗi nội bộ máy chủ khi xử lý đánh giá.");
        error.put("timestamp", LocalDateTime.now().toString());
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
    }
}
