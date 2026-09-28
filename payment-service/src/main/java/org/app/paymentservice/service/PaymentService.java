package org.app.paymentservice.service;

import org.app.paymentservice.dto.request.CreateQrRequest;
import org.app.paymentservice.dto.request.WebhookPayloadDto;
import org.app.paymentservice.dto.response.PaymentResponse;

import java.util.List;

public interface PaymentService {

    PaymentResponse createPayment(CreateQrRequest req);

    PaymentResponse getPaymentByCode(String paymentCode);

    PaymentResponse getLatestByTrackingCode(String trackingCode);

    List<String> getPaidTrackingCodes();

    boolean processWebhook(WebhookPayloadDto payload);

    PaymentResponse mockPay(String trackingCode);
}
