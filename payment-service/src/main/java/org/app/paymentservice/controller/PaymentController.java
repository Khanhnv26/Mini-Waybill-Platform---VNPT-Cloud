package org.app.paymentservice.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.app.paymentservice.dto.request.CreateQrRequest;
import org.app.paymentservice.dto.response.PaymentResponse;
import org.app.paymentservice.exception.PaymentNotFoundException;
import org.app.paymentservice.service.PaymentService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    @PostMapping("/create-qr")
    public ResponseEntity<PaymentResponse> createQrPayment(@Valid @RequestBody CreateQrRequest request) {
        PaymentResponse response = paymentService.createPayment(request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/paid-codes")
    public ResponseEntity<List<String>> getPaidTrackingCodes() {
        return ResponseEntity.ok(paymentService.getPaidTrackingCodes());
    }

    @GetMapping("/tracking/{trackingCode}")
    public ResponseEntity<PaymentResponse> getPaymentByTracking(@PathVariable String trackingCode) {
        PaymentResponse response = paymentService.getLatestByTrackingCode(trackingCode);
        if (response == null) {
            throw new PaymentNotFoundException("Không tìm thấy thông tin giao dịch thanh toán cho vận đơn: " + trackingCode);
        }
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{paymentCode}")
    public ResponseEntity<PaymentResponse> getPayment(@PathVariable String paymentCode) {
        PaymentResponse response = paymentService.getPaymentByCode(paymentCode);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/mock-pay/{trackingCode}")
    public ResponseEntity<Map<String, Object>> mockPay(@PathVariable String trackingCode) {
        PaymentResponse response = paymentService.mockPay(trackingCode);
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Thanh toán giả lập thành công cho đơn " + trackingCode,
                "data", response
        ));
    }
}
