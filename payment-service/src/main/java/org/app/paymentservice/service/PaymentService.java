package org.app.paymentservice.service;

import org.app.paymentservice.dto.request.ConfirmCashRequest;
import org.app.paymentservice.dto.request.CreateQrRequest;
import org.app.paymentservice.dto.request.PaymentFilterRequest;
import org.app.paymentservice.dto.request.WebhookPayloadDto;
import org.app.paymentservice.dto.response.PaymentResponse;
import org.app.paymentservice.dto.response.PaymentStatsResponse;
import org.springframework.data.domain.Page;

import java.util.List;

public interface PaymentService {

    PaymentResponse createPayment(CreateQrRequest req);

    PaymentResponse getPaymentByCode(String paymentCode);

    PaymentResponse getLatestByTrackingCode(String trackingCode);

    List<String> getPaidTrackingCodes();

    boolean processWebhook(WebhookPayloadDto payload);

    PaymentResponse mockPay(String trackingCode);

    Page<PaymentResponse> getTransactions(PaymentFilterRequest filter, String currentUserId, String userRoles);

    PaymentStatsResponse getStats(String customerCode, String currentUserId, String userRoles);

    PaymentResponse confirmCashPayment(ConfirmCashRequest req, String currentUserId);
}
