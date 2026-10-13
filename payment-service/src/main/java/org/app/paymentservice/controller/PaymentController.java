package org.app.paymentservice.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.app.paymentservice.dto.request.ConfirmCashRequest;
import org.app.paymentservice.dto.request.CreateQrRequest;
import org.app.paymentservice.dto.request.PaymentFilterRequest;
import org.app.paymentservice.dto.response.PaymentResponse;
import org.app.paymentservice.dto.response.PaymentStatsResponse;
import org.app.paymentservice.exception.PaymentNotFoundException;
import org.app.paymentservice.service.PaymentService;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    @GetMapping
    public ResponseEntity<Page<PaymentResponse>> getTransactions(
            @ModelAttribute PaymentFilterRequest filter,
            @RequestHeader(value = "X-User-Id", required = false) String currentUserId,
            @RequestHeader(value = "X-User-Roles", required = false) String userRoles) {
        Page<PaymentResponse> page = paymentService.getTransactions(filter, currentUserId, userRoles);
        return ResponseEntity.ok(page);
    }

    @GetMapping("/stats")
    public ResponseEntity<PaymentStatsResponse> getStats(
            @RequestParam(value = "customerCode", required = false) String customerCode,
            @RequestHeader(value = "X-User-Id", required = false) String currentUserId,
            @RequestHeader(value = "X-User-Roles", required = false) String userRoles) {
        PaymentStatsResponse stats = paymentService.getStats(customerCode, currentUserId, userRoles);
        return ResponseEntity.ok(stats);
    }

    @PostMapping("/confirm-cash")
    public ResponseEntity<PaymentResponse> confirmCash(
            @Valid @RequestBody ConfirmCashRequest request,
            @RequestHeader(value = "X-User-Id", required = false) String currentUserId) {
        PaymentResponse response = paymentService.confirmCashPayment(request, currentUserId);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/create-qr")
    public ResponseEntity<PaymentResponse> createQrPayment(
            @Valid @RequestBody CreateQrRequest request,
            @RequestHeader(value = "X-User-Id", required = false) String currentUserId) {
        if ((request.getCreatedBy() == null || request.getCreatedBy().isBlank()) && currentUserId != null) {
            request.setCreatedBy(currentUserId);
        }
        if ((request.getCustomerCode() == null || request.getCustomerCode().isBlank()) && currentUserId != null) {
            request.setCustomerCode(currentUserId);
        }
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
