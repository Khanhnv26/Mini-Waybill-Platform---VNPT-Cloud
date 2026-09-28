package org.app.paymentservice.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.app.paymentservice.dto.request.CreateQrRequest;
import org.app.paymentservice.dto.request.WebhookPayloadDto;
import org.app.paymentservice.dto.response.PaymentResponse;
import org.app.paymentservice.entity.*;
import org.app.paymentservice.exception.InvalidWebhookException;
import org.app.paymentservice.exception.PaymentNotFoundException;
import org.app.paymentservice.repository.PaymentTransactionRepository;
import org.app.paymentservice.repository.WebhookLogRepository;
import org.app.paymentservice.service.PaymentService;
import org.app.paymentservice.service.VietQrService;
import org.app.sharedevents.entity.PaymentSuccessEvent;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@Slf4j
@RequiredArgsConstructor
public class PaymentServiceImpl implements PaymentService {

    private static final String PAYMENT_SUCCESS_TOPIC = "payment-success-events";
    private static final Pattern TRACKING_PATTERN = Pattern.compile("(?i)(?:COD|CUOC)?\\s*([A-Z0-9_-]{5,30})");

    private final PaymentTransactionRepository paymentRepo;
    private final WebhookLogRepository webhookLogRepo;
    private final VietQrService vietQrService;
    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final StringRedisTemplate redisTemplate;

    @Override
    @Transactional
    public PaymentResponse createPayment(CreateQrRequest req) {
        String paymentCode = "PAY_" + req.getTrackingCode() + "_" + System.currentTimeMillis();
        PaymentType type = req.getPaymentType() != null ? req.getPaymentType() : PaymentType.COD;
        String memoPrefix = (type == PaymentType.SHIPPING_FEE) ? "CUOC " : "COD ";
        String qrUrl = vietQrService.generateQrUrl(req.getAmount(), memoPrefix + req.getTrackingCode(), paymentCode);

        PaymentTransaction tx = PaymentTransaction.builder()
                .paymentCode(paymentCode)
                .trackingCode(req.getTrackingCode())
                .amount(req.getAmount())
                .paymentType(type)
                .paymentMethod(PaymentMethod.VIETQR)
                .status(PaymentStatus.PENDING)
                .qrUrl(qrUrl)
                .bankCode(vietQrService.getDefaultBank())
                .accountNo(vietQrService.getDefaultAcc())
                .payerNote(req.getNote())
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        PaymentTransaction saved = paymentRepo.save(tx);
        log.info("[PAYMENT] Khởi tạo giao dịch thanh toán thành công: mã={}, vận đơn={}, loại={}, số tiền={}",
                paymentCode, req.getTrackingCode(), type, req.getAmount());

        return PaymentResponse.from(saved);
    }

    @Override
    public PaymentResponse getPaymentByCode(String paymentCode) {
        PaymentTransaction tx = paymentRepo.findByPaymentCode(paymentCode)
                .orElseThrow(() -> new PaymentNotFoundException("Không tìm thấy thông tin giao dịch thanh toán với mã: " + paymentCode));
        return PaymentResponse.from(tx);
    }

    @Override
    public PaymentResponse getLatestByTrackingCode(String trackingCode) {
        return paymentRepo.findFirstByTrackingCodeAndStatusOrderByCreatedAtDesc(trackingCode, PaymentStatus.PENDING)
                .map(PaymentResponse::from)
                .orElseGet(() -> paymentRepo.findByTrackingCodeOrderByCreatedAtDesc(trackingCode).stream()
                        .findFirst()
                        .map(PaymentResponse::from)
                        .orElse(null));
    }

    @Override
    @Transactional
    public boolean processWebhook(WebhookPayloadDto payload) {
        String ref = payload.getReferenceCode() != null ? payload.getReferenceCode() : UUID.randomUUID().toString();
        String lockKey = "payment:webhook:processed:" + ref;

        Boolean isFirst = redisTemplate.opsForValue().setIfAbsent(lockKey, "1", Duration.ofHours(24));
        if (Boolean.FALSE.equals(isFirst)) {
            log.warn("[PAYMENT-WEBHOOK] Trùng lặp mã tham chiếu giao dịch: {}. Đã bỏ qua xử lý lặp lại.", ref);
            return true;
        }

        String rawContent = payload.getContent() != null ? payload.getContent() : "";
        String trackingCode = extractTrackingCode(rawContent);

        WebhookLog webhookLog = WebhookLog.builder()
                .gatewayName(payload.getGatewayName() != null ? payload.getGatewayName() : "VIETQR_GATEWAY")
                .rawPayload(rawContent + " | ref: " + ref + " | amount: " + payload.getAmount())
                .signature(payload.getSignature())
                .isProcessed(false)
                .receivedAt(LocalDateTime.now())
                .build();

        if (trackingCode == null || trackingCode.isBlank()) {
            webhookLog.setErrorMessage("Không thể trích xuất mã vận đơn từ nội dung chuyển khoản: " + rawContent);
            webhookLogRepo.save(webhookLog);
            log.error("[PAYMENT-WEBHOOK] Không thể trích xuất mã vận đơn từ nội dung: {}", rawContent);
            throw new InvalidWebhookException("Không thể trích xuất mã vận đơn từ nội dung chuyển khoản: " + rawContent);
        }

        Optional<PaymentTransaction> pendingTxOpt = paymentRepo
                .findFirstByTrackingCodeAndStatusOrderByCreatedAtDesc(trackingCode, PaymentStatus.PENDING);

        PaymentTransaction tx;
        if (pendingTxOpt.isPresent()) {
            tx = pendingTxOpt.get();
        } else {
            PaymentType detectedType = rawContent.toUpperCase().contains("CUOC") ? PaymentType.SHIPPING_FEE : PaymentType.COD;
            tx = PaymentTransaction.builder()
                    .paymentCode("AUTO_PAY_" + trackingCode + "_" + System.currentTimeMillis())
                    .trackingCode(trackingCode)
                    .amount(payload.getAmount() != null ? payload.getAmount() : BigDecimal.ZERO)
                    .paymentType(detectedType)
                    .paymentMethod(PaymentMethod.VIETQR)
                    .createdAt(LocalDateTime.now())
                    .build();
        }

        tx.setStatus(PaymentStatus.SUCCESS);
        tx.setPaidAt(LocalDateTime.now());
        tx.setReferenceCode(ref);
        tx.setPayerNote(rawContent);
        if (payload.getAmount() != null && payload.getAmount().compareTo(BigDecimal.ZERO) > 0) {
            tx.setAmount(payload.getAmount());
        }
        PaymentTransaction saved = paymentRepo.save(tx);

        webhookLog.setIsProcessed(true);
        webhookLogRepo.save(webhookLog);

        PaymentSuccessEvent event = PaymentSuccessEvent.builder()
                .eventId(UUID.randomUUID().toString())
                .paymentCode(saved.getPaymentCode())
                .trackingCode(saved.getTrackingCode())
                .amount(saved.getAmount())
                .paymentType(saved.getPaymentType().name())
                .paymentMethod(saved.getPaymentMethod().name())
                .referenceCode(ref)
                .payerNote(rawContent)
                .paidAt(saved.getPaidAt())
                .build();

        kafkaTemplate.send(PAYMENT_SUCCESS_TOPIC, saved.getTrackingCode(), event);
        log.info("[PAYMENT] Giao dịch thanh toán thành công và đã phát sự kiện lên Kafka: vận đơn={}, mã GD={}, số tiền={}",
                saved.getTrackingCode(), saved.getPaymentCode(), saved.getAmount());

        return true;
    }

    @Override
    @Transactional
    public PaymentResponse mockPay(String trackingCode) {
        PaymentResponse latest = getLatestByTrackingCode(trackingCode);
        BigDecimal amount = (latest != null && latest.getAmount() != null) ? latest.getAmount() : BigDecimal.valueOf(500000);
        String prefix = (latest != null && latest.getPaymentType() == PaymentType.SHIPPING_FEE) ? "CUOC " : "COD ";

        WebhookPayloadDto mockDto = WebhookPayloadDto.builder()
                .gatewayName("MOCK_SEPAY")
                .referenceCode("MOCK_REF_" + System.currentTimeMillis())
                .amount(amount)
                .content(prefix + trackingCode)
                .build();

        processWebhook(mockDto);
        return getLatestByTrackingCode(trackingCode);
    }

    private String extractTrackingCode(String content) {
        if (content == null || content.isBlank()) {
            return null;
        }
        Matcher matcher = TRACKING_PATTERN.matcher(content.trim());
        if (matcher.find()) {
            return matcher.group(1).trim().toUpperCase();
        }
        return null;
    }
}
