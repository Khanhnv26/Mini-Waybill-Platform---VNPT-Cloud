package org.app.paymentservice.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import jakarta.persistence.criteria.Predicate;
import org.app.paymentservice.dto.request.ConfirmCashRequest;
import org.app.paymentservice.dto.request.CreateQrRequest;
import org.app.paymentservice.dto.request.PaymentFilterRequest;
import org.app.paymentservice.dto.request.WebhookPayloadDto;
import org.app.paymentservice.dto.response.PaymentResponse;
import org.app.paymentservice.dto.response.PaymentStatsResponse;
import org.app.paymentservice.entity.*;
import org.app.paymentservice.exception.InvalidWebhookException;
import org.app.paymentservice.exception.PaymentException;
import org.app.paymentservice.exception.PaymentNotFoundException;
import org.app.paymentservice.repository.PaymentTransactionRepository;
import org.app.paymentservice.repository.WebhookLogRepository;
import org.app.paymentservice.service.PaymentService;
import org.app.paymentservice.service.VietQrService;
import org.app.sharedevents.entity.PaymentSuccessEvent;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@Slf4j
@RequiredArgsConstructor
public class PaymentServiceImpl implements PaymentService {

    private static final String PAYMENT_SUCCESS_TOPIC = "payment-success-events";
    private static final Pattern TRACKING_PATTERN = Pattern.compile("(?i)(?:COD|CUOC|HOAN)?\\s*([A-Z0-9_-]{5,30})");

    private final PaymentTransactionRepository paymentRepo;
    private final WebhookLogRepository webhookLogRepo;
    private final VietQrService vietQrService;
    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final StringRedisTemplate redisTemplate;

    @Override
    @Transactional
    public PaymentResponse createPayment(CreateQrRequest req) {
        if (req == null || req.getTrackingCode() == null || req.getTrackingCode().isBlank()) {
            throw new PaymentException("INVALID_REQUEST", "Mã vận đơn không được để trống!");
        }

        if (isShipmentCancelled(req.getTrackingCode())) {
            log.warn("[PAYMENT] Từ chối tạo yêu cầu thanh toán cho đơn hàng đã hủy: {}", req.getTrackingCode());
            throw new PaymentException("SHIPMENT_CANCELLED", "Đơn hàng " + req.getTrackingCode() + " đã bị hủy, không thể khởi tạo thanh toán cước phí hoặc COD!");
        }

        PaymentType type = req.getPaymentType() != null ? req.getPaymentType() : PaymentType.COD;

        Optional<PaymentTransaction> successfulTx = paymentRepo.findByTrackingCodeOrderByCreatedAtDesc(req.getTrackingCode())
                .stream()
                .filter(tx -> tx.getPaymentType() == type && tx.getStatus() == PaymentStatus.SUCCESS)
                .findFirst();

        if (successfulTx.isPresent()) {
            log.info("[PAYMENT] Vận đơn {} đã thanh toán {} thành công trước đó: mã={}",
                    req.getTrackingCode(), type, successfulTx.get().getPaymentCode());
            return PaymentResponse.from(successfulTx.get());
        }

        Optional<PaymentTransaction> pendingTx = paymentRepo
                .findFirstByTrackingCodeAndStatusOrderByCreatedAtDesc(req.getTrackingCode(), PaymentStatus.PENDING);
        if (pendingTx.isPresent() && pendingTx.get().getPaymentType() == type) {
            PaymentTransaction existingPending = pendingTx.get();
            if (existingPending.getCreatedAt() != null && existingPending.getCreatedAt().isAfter(LocalDateTime.now().minusMinutes(10))) {
                return PaymentResponse.from(existingPending);
            }
        }

        String paymentCode = "PAY_" + req.getTrackingCode() + "_" + System.currentTimeMillis();
        String memoPrefix = (type == PaymentType.SHIPPING_FEE) ? "CUOC " : (type == PaymentType.RETURN_FEE ? "HOAN " : "COD ");
        String sanitizedTracking = req.getTrackingCode().replaceAll("(?i)^VNPT-?", "WB-");
        String qrUrl = vietQrService.generateQrUrl(req.getAmount(), memoPrefix + sanitizedTracking, paymentCode);

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
                .customerCode(req.getCustomerCode())
                .createdBy(req.getCreatedBy())
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
        List<PaymentTransaction> transactions = paymentRepo.findByTrackingCodeOrderByCreatedAtDesc(trackingCode);
        if (transactions.isEmpty()) {
            return null;
        }

        Optional<PaymentTransaction> pendingTx = transactions.stream()
                .filter(tx -> tx.getStatus() == PaymentStatus.PENDING)
                .findFirst();
        if (pendingTx.isPresent()) {
            return PaymentResponse.from(pendingTx.get());
        }

        Optional<PaymentTransaction> successTx = transactions.stream()
                .filter(tx -> tx.getStatus() == PaymentStatus.SUCCESS)
                .findFirst();
        if (successTx.isPresent()) {
            return PaymentResponse.from(successTx.get());
        }

        return PaymentResponse.from(transactions.get(0));
    }

    @Override
    public List<String> getPaidTrackingCodes() {
        List<PaymentTransaction> paidTransactions = new java.util.ArrayList<>(
                paymentRepo.findByStatusAndPaymentType(PaymentStatus.SUCCESS, PaymentType.SHIPPING_FEE)
        );
        paidTransactions.addAll(
                paymentRepo.findByStatusAndPaymentType(PaymentStatus.SUCCESS, PaymentType.COD)
        );
        return paidTransactions.stream()
                .map(PaymentTransaction::getTrackingCode)
                .filter(code -> code != null && !code.isBlank())
                .distinct()
                .toList();
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

        if (isShipmentCancelled(trackingCode)) {
            webhookLog.setErrorMessage("Đơn hàng " + trackingCode + " đã bị hủy, từ chối ghi nhận thanh toán");
            webhookLogRepo.save(webhookLog);
            log.warn("[PAYMENT-WEBHOOK] Vận đơn {} đã bị hủy trước đó. Từ chối xử lý biến động số dư và ghi log.", trackingCode);
            return false;
        }

        Optional<PaymentTransaction> pendingTxOpt = paymentRepo
                .findFirstByTrackingCodeAndStatusOrderByCreatedAtDesc(trackingCode, PaymentStatus.PENDING);
        if (pendingTxOpt.isEmpty() && trackingCode.startsWith("WB-")) {
            String altCode = "VNPT-" + trackingCode.substring(3);
            pendingTxOpt = paymentRepo.findFirstByTrackingCodeAndStatusOrderByCreatedAtDesc(altCode, PaymentStatus.PENDING);
        }

        PaymentTransaction tx;
        if (pendingTxOpt.isPresent()) {
            tx = pendingTxOpt.get();
        } else {
            String upper = rawContent.toUpperCase();
            PaymentType detectedType;
            if (upper.contains("HOAN")) {
                detectedType = PaymentType.RETURN_FEE;
            } else if (upper.contains("CUOC")) {
                detectedType = PaymentType.SHIPPING_FEE;
            } else {
                detectedType = PaymentType.COD;
            }

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
        if (isShipmentCancelled(trackingCode)) {
            log.warn("[PAYMENT-MOCK] Từ chối giả lập thanh toán cho đơn hàng đã hủy: {}", trackingCode);
            throw new PaymentException("SHIPMENT_CANCELLED", "Đơn hàng " + trackingCode + " đã bị hủy, không thể thực hiện thanh toán!");
        }

        PaymentResponse latest = getLatestByTrackingCode(trackingCode);
        BigDecimal amount = (latest != null && latest.getAmount() != null) ? latest.getAmount() : BigDecimal.valueOf(35000);
        String prefix;
        if (latest != null && latest.getPaymentType() == PaymentType.COD) {
            prefix = "COD ";
        } else if (latest != null && latest.getPaymentType() == PaymentType.RETURN_FEE) {
            prefix = "HOAN ";
        } else {
            prefix = "CUOC ";
        }

        WebhookPayloadDto mockDto = WebhookPayloadDto.builder()
                .gatewayName("MOCK_SEPAY")
                .referenceCode("MOCK_REF_" + System.currentTimeMillis())
                .amount(amount)
                .content(prefix + trackingCode.replaceAll("(?i)^VNPT-?", "WB-"))
                .build();

        processWebhook(mockDto);
        return getLatestByTrackingCode(trackingCode);
    }

    private boolean isShipmentCancelled(String trackingCode) {
        if (trackingCode == null || trackingCode.isBlank()) {
            return false;
        }
        String cleanCode = trackingCode.trim().toUpperCase();
        try {
            if (Boolean.TRUE.equals(redisTemplate.hasKey("shipment-cancelled:" + cleanCode))) {
                return true;
            }
            String status = redisTemplate.opsForValue().get("shipment-status:" + cleanCode);
            if ("CANCELLED".equalsIgnoreCase(status)) {
                return true;
            }
        } catch (Exception e) {
            log.warn("[PAYMENT] Không thể kiểm tra trạng thái hủy từ Redis cho mã {}: {}", cleanCode, e.getMessage());
        }
        return false;
    }

    private String extractTrackingCode(String content) {
        if (content == null || content.isBlank()) {
            return null;
        }
        String cleanContent = content.trim().replaceAll("(?i)VNPT-?", "").replaceAll("(?i)VNPT", "");
        Matcher matcher = TRACKING_PATTERN.matcher(cleanContent);
        if (matcher.find()) {
            return matcher.group(1).trim().toUpperCase();
        }
        return null;
    }

    @Override
    @Transactional(readOnly = true)
    public Page<PaymentResponse> getTransactions(PaymentFilterRequest filter, String currentUserId, String userRoles) {
        if (filter == null) {
            filter = new PaymentFilterRequest();
        }

        boolean isPureCustomer = isCustomerOnly(userRoles);
        final String effectiveCustomerCode;
        if (isPureCustomer) {
            if (currentUserId == null || currentUserId.isBlank()) {
                throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.UNAUTHORIZED);
            }
            effectiveCustomerCode = currentUserId;
        } else {
            effectiveCustomerCode = filter.getCustomerCode();
        }

        final PaymentFilterRequest f = filter;
        Specification<PaymentTransaction> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (f.getKeyword() != null && !f.getKeyword().isBlank()) {
                String kw = "%" + f.getKeyword().trim().toUpperCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.upper(root.get("trackingCode")), kw),
                        cb.like(cb.upper(root.get("paymentCode")), kw),
                        cb.like(cb.upper(root.get("referenceCode")), kw)
                ));
            }

            if (f.getStatus() != null) {
                predicates.add(cb.equal(root.get("status"), f.getStatus()));
            }

            if (f.getPaymentType() != null) {
                predicates.add(cb.equal(root.get("paymentType"), f.getPaymentType()));
            }

            if (f.getPaymentMethod() != null) {
                predicates.add(cb.equal(root.get("paymentMethod"), f.getPaymentMethod()));
            }

            if (effectiveCustomerCode != null && !effectiveCustomerCode.isBlank()) {
                if (isPureCustomer) {
                    predicates.add(cb.or(
                            cb.equal(root.get("customerCode"), effectiveCustomerCode),
                            cb.equal(root.get("createdBy"), effectiveCustomerCode)
                    ));
                } else {
                    predicates.add(cb.equal(root.get("customerCode"), effectiveCustomerCode));
                }
            }

            if (f.getFromDate() != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), f.getFromDate()));
            }

            if (f.getToDate() != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("createdAt"), f.getToDate()));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        int page = Math.max(0, filter.getPage());
        int size = (filter.getSize() > 0 && filter.getSize() <= 200) ? filter.getSize() : 20;
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));

        return paymentRepo.findAll(spec, pageable).map(PaymentResponse::from);
    }

    @Override
    @Transactional(readOnly = true)
    public PaymentStatsResponse getStats(String customerCode, String currentUserId, String userRoles) {
        boolean isPureCustomer = isCustomerOnly(userRoles);
        final String effectiveCustomerCode;
        if (isPureCustomer) {
            if (currentUserId == null || currentUserId.isBlank()) {
                throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.UNAUTHORIZED);
            }
            effectiveCustomerCode = currentUserId;
        } else {
            effectiveCustomerCode = customerCode;
        }

        Specification<PaymentTransaction> spec = (root, query, cb) -> {
            if (effectiveCustomerCode != null && !effectiveCustomerCode.isBlank()) {
                if (isPureCustomer) {
                    return cb.or(
                            cb.equal(root.get("customerCode"), effectiveCustomerCode),
                            cb.equal(root.get("createdBy"), effectiveCustomerCode)
                    );
                }
                return cb.equal(root.get("customerCode"), effectiveCustomerCode);
            }
            return cb.conjunction();
        };

        List<PaymentTransaction> list = paymentRepo.findAll(spec);

        BigDecimal totalCodSuccess = BigDecimal.ZERO;
        BigDecimal totalShippingFeeSuccess = BigDecimal.ZERO;
        BigDecimal totalCodPending = BigDecimal.ZERO;
        long pendingCount = 0;
        long successCount = 0;

        for (PaymentTransaction tx : list) {
            BigDecimal amt = tx.getAmount() != null ? tx.getAmount() : BigDecimal.ZERO;
            if (tx.getStatus() == PaymentStatus.SUCCESS) {
                successCount++;
                if (tx.getPaymentType() == PaymentType.COD) {
                    totalCodSuccess = totalCodSuccess.add(amt);
                } else if (tx.getPaymentType() == PaymentType.SHIPPING_FEE) {
                    totalShippingFeeSuccess = totalShippingFeeSuccess.add(amt);
                }
            } else if (tx.getStatus() == PaymentStatus.PENDING) {
                pendingCount++;
                if (tx.getPaymentType() == PaymentType.COD) {
                    totalCodPending = totalCodPending.add(amt);
                }
            }
        }

        return PaymentStatsResponse.builder()
                .totalCodSuccess(totalCodSuccess)
                .totalShippingFeeSuccess(totalShippingFeeSuccess)
                .totalCodPending(totalCodPending)
                .pendingCount(pendingCount)
                .successCount(successCount)
                .totalCount(list.size())
                .build();
    }

    @Override
    @Transactional
    public PaymentResponse confirmCashPayment(ConfirmCashRequest req, String currentUserId) {
        if (req == null || req.getTrackingCode() == null || req.getTrackingCode().isBlank()) {
            throw new PaymentException("INVALID_REQUEST", "Mã vận đơn không được để trống!");
        }
        String trackingCode = req.getTrackingCode().trim().toUpperCase();

        if (isShipmentCancelled(trackingCode)) {
            throw new PaymentException("SHIPMENT_CANCELLED", "Đơn hàng " + trackingCode + " đã bị hủy, không thể xác nhận thu tiền mặt!");
        }

        PaymentType type = req.getPaymentType() != null ? req.getPaymentType() : PaymentType.COD;

        Optional<PaymentTransaction> pendingTxOpt = paymentRepo
                .findFirstByTrackingCodeAndStatusOrderByCreatedAtDesc(trackingCode, PaymentStatus.PENDING);

        PaymentTransaction tx;
        if (pendingTxOpt.isPresent()) {
            tx = pendingTxOpt.get();
            if (req.getAmount() != null && req.getAmount().compareTo(BigDecimal.ZERO) > 0) {
                tx.setAmount(req.getAmount());
            }
            if (req.getPaymentType() != null) {
                tx.setPaymentType(req.getPaymentType());
            }
        } else {
            BigDecimal amount = (req.getAmount() != null && req.getAmount().compareTo(BigDecimal.ZERO) > 0)
                    ? req.getAmount() : BigDecimal.valueOf(35000);
            tx = PaymentTransaction.builder()
                    .paymentCode("CASH_" + trackingCode + "_" + System.currentTimeMillis())
                    .trackingCode(trackingCode)
                    .amount(amount)
                    .paymentType(type)
                    .createdAt(LocalDateTime.now())
                    .build();
        }

        tx.setPaymentMethod(PaymentMethod.CASH);
        tx.setStatus(PaymentStatus.SUCCESS);
        tx.setPaidAt(LocalDateTime.now());
        tx.setReferenceCode("CASH_REF_" + System.currentTimeMillis());
        tx.setPayerNote(req.getNote() != null && !req.getNote().isBlank() ? req.getNote() : "Thu tiền mặt trực tiếp");
        if (currentUserId != null && !currentUserId.isBlank()) {
            tx.setCreatedBy(currentUserId);
        }

        PaymentTransaction saved = paymentRepo.save(tx);

        PaymentSuccessEvent event = PaymentSuccessEvent.builder()
                .eventId(UUID.randomUUID().toString())
                .paymentCode(saved.getPaymentCode())
                .trackingCode(saved.getTrackingCode())
                .amount(saved.getAmount())
                .paymentType(saved.getPaymentType().name())
                .paymentMethod(saved.getPaymentMethod().name())
                .referenceCode(saved.getReferenceCode())
                .payerNote(saved.getPayerNote())
                .paidAt(saved.getPaidAt())
                .build();

        kafkaTemplate.send(PAYMENT_SUCCESS_TOPIC, saved.getTrackingCode(), event);
        log.info("[PAYMENT] Đã xác nhận thu tiền mặt và phát Kafka event: đơn={}, mã GD={}, số tiền={}",
                saved.getTrackingCode(), saved.getPaymentCode(), saved.getAmount());

        return PaymentResponse.from(saved);
    }

    private boolean isCustomerOnly(String userRoles) {
        return !org.app.sharedevents.security.RoleAccess.hasAny(userRoles,
                "ADMIN", "CS", "POST_OFFICE_OPERATOR", "POST_OFFICE_STAFF", "DISPATCHER", "HUB_OPERATOR");
    }
}
