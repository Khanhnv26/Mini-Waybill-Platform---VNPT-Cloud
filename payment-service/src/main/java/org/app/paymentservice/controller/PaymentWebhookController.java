package org.app.paymentservice.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.app.paymentservice.dto.request.WebhookPayloadDto;
import org.app.paymentservice.service.PaymentService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
@Slf4j
public class PaymentWebhookController {

    private final PaymentService paymentService;

    @Value("${vietqr.webhook-secret:vnpt_waybill_secret_2026}")
    private String configuredSecret;

    @PostMapping("/webhook")
    public ResponseEntity<Map<String, Object>> handleWebhook(
            @RequestHeader(value = "X-Webhook-Secret", required = false) String secretHeader,
            @RequestBody WebhookPayloadDto payload) {

        if (secretHeader != null && !secretHeader.isBlank() && !configuredSecret.equals(secretHeader)) {
            log.warn("[PAYMENT-WEBHOOK] Chữ ký bí mật không hợp lệ: {}", secretHeader);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                    "success", false,
                    "message", "Chữ ký xác thực webhook không hợp lệ hoặc chưa được ủy quyền"
            ));
        }

        boolean processed = paymentService.processWebhook(payload);
        if (!processed) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "success", false,
                    "message", "Không thể phân tích cú pháp hoặc xử lý dữ liệu webhook"
            ));
        }

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Xử lý dữ liệu webhook thanh toán thành công"
        ));
    }
}
