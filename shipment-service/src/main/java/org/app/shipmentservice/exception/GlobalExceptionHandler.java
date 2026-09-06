package org.app.shipmentservice.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.support.MethodArgumentTypeMismatchException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Map<String,String>> handleRuntimeException (RuntimeException ex) {
        Map<String, String> error = new HashMap<>();
        error.put("errorCode", "BAD_REQUEST");
        error.put("error", ex.getMessage());
        error.put("timestamp", LocalDateTime.now().toString());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String,String>> handleValidateException(MethodArgumentNotValidException ex) {
        Map<String,String> errors = new HashMap<>();
        errors.put("errorCode", "VALIDATION_ERROR");
        ex.getBindingResult().getFieldErrors().forEach(error ->
                errors.put(error.getField(), error.getDefaultMessage()));
        errors.put("timestamp", LocalDateTime.now().toString());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errors);
    }

    @ExceptionHandler(DuplicateRequestException.class)
    public ResponseEntity<Map<String,String>> handleDuplicateRequestException(DuplicateRequestException ex) {
        Map<String, String> error = new HashMap<>();
        error.put("errorCode", "DUPLICATE_REQUEST");
        error.put("requestId", ex.getId());
        error.put("error", ex.getMessage());
        error.put("timestamp", LocalDateTime.now().toString());
        return ResponseEntity.status(HttpStatus.CONFLICT).body(error);
    }

    @ExceptionHandler(ForbiddenException.class)
    public ResponseEntity<Map<String,String>> handleForbiddenException(ForbiddenException ex) {
        Map<String, String> error = new HashMap<>();
        error.put("errorCode", "FORBIDDEN");
        error.put("error", ex.getMessage());
        error.put("timestamp", LocalDateTime.now().toString());
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(error);
    }

    @ExceptionHandler(UnauthorizedException.class)
    public ResponseEntity<Map<String,String>> handleUnauthorizedException(UnauthorizedException ex) {
        Map<String, String> error = new HashMap<>();
        error.put("errorCode", "UNAUTHORIZED");
        error.put("error", ex.getMessage());
        error.put("timestamp", LocalDateTime.now().toString());
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error);
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<Map<String, String>> handleMissingParams(MissingServletRequestParameterException ex) {
        Map<String, String> error = new HashMap<>();
        error.put("errorCode", "MISSING_PARAMETER");
        error.put("error", "Thiếu tham số bắt buộc: " + ex.getParameterName());
        error.put("timestamp", LocalDateTime.now().toString());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<Map<String, String>> handleTypeMismatch(org.springframework.web.method.annotation.MethodArgumentTypeMismatchException ex) {
        Map<String, String> error = new HashMap<>();
        error.put("errorCode", "INVALID_PARAMETER_TYPE");
        error.put("error", "Kiểu dữ liệu tham số '" + ex.getName() + "' không hợp lệ: " + ex.getValue());
        error.put("timestamp", LocalDateTime.now().toString());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }
}
