package org.app.supportservice.exception;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

class GlobalExceptionHandlerTest {

    @Test
    void aiOutageResponseHidesProviderDetails() {
        GlobalExceptionHandler handler = new GlobalExceptionHandler();
        AiUnavailableException exception = new AiUnavailableException(
                "gemini call failed",
                new IllegalStateException("model rejected key AQ.secret-value"));

        ResponseEntity<Map<String, Object>> response = handler.handleAiUnavailable(exception);

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, response.getStatusCode());
        assertEquals("AI_UNAVAILABLE", response.getBody().get("errorCode"));
        String message = String.valueOf(response.getBody().get("message"));
        assertFalse(message.contains("AQ."));
        assertFalse(message.contains("gemini"));
        assertFalse(response.getBody().toString().contains("secret-value"));
    }
}
