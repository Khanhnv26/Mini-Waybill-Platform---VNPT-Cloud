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
        String msg = ex.getMessage();
        if (msg != null && (msg.contains("UNIQUE") || msg.contains("duplicate key"))) {
            if (msg.contains("customer_code") || msg.contains("UKiqv746oh5t5is1vr4p2nl79r6")) {
                error.put("error", "Mã khách hàng này đã tồn tại trong hệ thống");
            } else if (msg.contains("email") || msg.contains("UKrfbvkrffamfql7cjtx8v5997v")) {
                error.put("error", "Email này đã được đăng ký cho một khách hàng khác");
            } else {
                error.put("error", "Dữ liệu bị trùng lặp (Mã khách hàng hoặc Email đã tồn tại)");
            }
        } else {
            error.put("error", "Lỗi ràng buộc dữ liệu: " + (ex.getRootCause() != null ? ex.getRootCause().getMessage() : ex.getMessage()));
        }
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String,String>> handleValidateException(MethodArgumentNotValidException ex) {
        Map<String,String> errors = new HashMap<>();
        ex.getBindingResult().getFieldErrors().forEach(error -> errors.put(error.getField(),error.getDefaultMessage()));
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errors);
    }
}
