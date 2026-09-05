package org.app.shipmentservice.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
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
}
