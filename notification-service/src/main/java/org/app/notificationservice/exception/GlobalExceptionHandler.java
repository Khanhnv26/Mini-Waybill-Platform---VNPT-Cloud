package org.app.notificationservice.exception;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.telegram.telegrambots.meta.exceptions.TelegramApiException;
import org.telegram.telegrambots.meta.exceptions.TelegramApiRequestException;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(TelegramApiRequestException.class)
    public ResponseEntity<Map<String, Object>> handleTelegramApiRequestException(TelegramApiRequestException ex) {
        int errorCode = ex.getErrorCode();
        String apiResponse = ex.getApiResponse();

        log.error("[NOTIFICATION] Telegram API Request Error: Code={} | Response={}", errorCode, apiResponse, ex);

        Map<String, Object> error = new HashMap<>();
        error.put("errorCode", "TELEGRAM_API_ERROR");
        error.put("telegramErrorCode", errorCode);
        error.put("timestamp", LocalDateTime.now().toString());

        if (errorCode == 403) {
            error.put("error", "Không thể gửi tin nhắn do người dùng đã chặn bot hoặc chưa kích hoạt bot.");
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(error);
        } else if (errorCode == 429) {
            error.put("error", "Bị Telegram giới hạn tần suất gửi tin nhắn. Vui lòng thử lại sau.");
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(error);
        } else if (errorCode == 400) {
            error.put("error", "Yêu cầu gửi tin Telegram không hợp lệ (Chat ID không đúng hoặc sai định dạng).");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
        }

        error.put("error", "Telegram API Error: " + apiResponse);
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(error);
    }

    @ExceptionHandler(TelegramApiException.class)
    public ResponseEntity<Map<String, Object>> handleTelegramApiException(TelegramApiException ex) {
        log.error("[NOTIFICATION] Telegram API Exception: {}", ex.getMessage(), ex);

        Map<String, Object> error = new HashMap<>();
        error.put("errorCode", "TELEGRAM_COMMUNICATION_ERROR");
        error.put("error", "Không thể kết nối đến máy chủ Telegram: " + ex.getMessage());
        error.put("timestamp", LocalDateTime.now().toString());
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(error);
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Map<String, Object>> handleRuntimeException(RuntimeException ex) {
        log.warn("[NOTIFICATION] Runtime exception: {}", ex.getMessage());
        Map<String, Object> error = new HashMap<>();
        error.put("errorCode", "BAD_REQUEST");
        error.put("error", ex.getMessage());
        error.put("timestamp", LocalDateTime.now().toString());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGeneralException(Exception ex) {
        log.error("[NOTIFICATION] General exception: {}", ex.getMessage(), ex);
        Map<String, Object> error = new HashMap<>();
        error.put("errorCode", "INTERNAL_SERVER_ERROR");
        error.put("error", "Đã xảy ra lỗi nội bộ hệ thống thông báo!");
        error.put("timestamp", LocalDateTime.now().toString());
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
    }
}
