package org.app.paymentservice.service;

import org.app.paymentservice.dto.request.CreateQrRequest;
import org.app.paymentservice.dto.request.WebhookPayloadDto;
import org.app.paymentservice.dto.response.PaymentResponse;
import org.app.paymentservice.entity.PaymentMethod;
import org.app.paymentservice.entity.PaymentStatus;
import org.app.paymentservice.entity.PaymentTransaction;
import org.app.paymentservice.entity.PaymentType;
import org.app.paymentservice.repository.PaymentTransactionRepository;
import org.app.paymentservice.repository.WebhookLogRepository;
import org.app.paymentservice.service.impl.PaymentServiceImpl;
import org.app.sharedevents.entity.PaymentSuccessEvent;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.kafka.core.KafkaTemplate;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PaymentReturnFeeTest {

    @Mock
    private PaymentTransactionRepository paymentRepo;

    @Mock
    private WebhookLogRepository webhookLogRepo;

    @Mock
    private VietQrService vietQrService;

    @Mock
    private KafkaTemplate<String, Object> kafkaTemplate;

    @Mock
    private StringRedisTemplate redisTemplate;

    @Mock
    private ValueOperations<String, String> valueOperations;

    @InjectMocks
    private PaymentServiceImpl paymentService;

    @BeforeEach
    void setUp() {
        lenient().when(redisTemplate.opsForValue()).thenReturn(valueOperations);
    }

    @Test
    @DisplayName("Khởi tạo QR cho RETURN_FEE với memo prefix HOAN")
    void testCreatePaymentForReturnFee() {
        when(redisTemplate.hasKey(anyString())).thenReturn(false);
        when(paymentRepo.findByTrackingCodeOrderByCreatedAtDesc("WB_RET_001"))
                .thenReturn(List.of());
        when(paymentRepo.findFirstByTrackingCodeAndStatusOrderByCreatedAtDesc("WB_RET_001", PaymentStatus.PENDING))
                .thenReturn(Optional.empty());
        when(vietQrService.generateQrUrl(eq(BigDecimal.valueOf(17500)), eq("HOAN WB_RET_001"), anyString()))
                .thenReturn("https://vietqr.net/img.png");
        when(paymentRepo.save(any(PaymentTransaction.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        CreateQrRequest req = CreateQrRequest.builder()
                .trackingCode("WB_RET_001")
                .amount(BigDecimal.valueOf(17500))
                .paymentType(PaymentType.RETURN_FEE)
                .note("Cước hoàn đơn WB_RET_001")
                .build();

        PaymentResponse res = paymentService.createPayment(req);

        assertNotNull(res);
        assertEquals(PaymentType.RETURN_FEE, res.getPaymentType());
        assertEquals(BigDecimal.valueOf(17500), res.getAmount());
    }

    @Test
    @DisplayName("Xử lý Webhook ngân hàng với nội dung HOAN WB_RET_001")
    void testProcessWebhookWithReturnFeeContent() {
        when(valueOperations.setIfAbsent(anyString(), eq("1"), any(Duration.class))).thenReturn(Boolean.TRUE);
        when(redisTemplate.hasKey(anyString())).thenReturn(false);

        PaymentTransaction pendingTx = PaymentTransaction.builder()
                .paymentCode("PAY_WB_RET_001_123")
                .trackingCode("WB_RET_001")
                .amount(BigDecimal.valueOf(17500))
                .paymentType(PaymentType.RETURN_FEE)
                .paymentMethod(PaymentMethod.VIETQR)
                .status(PaymentStatus.PENDING)
                .createdAt(LocalDateTime.now())
                .build();

        when(paymentRepo.findFirstByTrackingCodeAndStatusOrderByCreatedAtDesc("WB_RET_001", PaymentStatus.PENDING))
                .thenReturn(Optional.of(pendingTx));
        when(paymentRepo.save(any(PaymentTransaction.class))).thenAnswer(inv -> inv.getArgument(0));

        WebhookPayloadDto payload = WebhookPayloadDto.builder()
                .gatewayName("VIETQR_GATEWAY")
                .referenceCode("REF_123456")
                .amount(BigDecimal.valueOf(17500))
                .content("HOAN WB_RET_001 chuyen khoan cuoc hoan")
                .build();

        boolean processed = paymentService.processWebhook(payload);

        assertTrue(processed);
        assertEquals(PaymentStatus.SUCCESS, pendingTx.getStatus());
        assertEquals("REF_123456", pendingTx.getReferenceCode());

        ArgumentCaptor<PaymentSuccessEvent> eventCaptor = ArgumentCaptor.forClass(PaymentSuccessEvent.class);
        verify(kafkaTemplate).send(eq("payment-success-events"), eq("WB_RET_001"), eventCaptor.capture());
        assertEquals("RETURN_FEE", eventCaptor.getValue().getPaymentType());
        assertEquals("WB_RET_001", eventCaptor.getValue().getTrackingCode());
    }

    @Test
    @DisplayName("getLatestByTrackingCode ưu tiên giao dịch PENDING của RETURN_FEE khi đơn đã từng có SHIPPING_FEE SUCCESS")
    void testGetLatestPrioritizesPendingReturnFee() {
        PaymentTransaction oldShippingSuccess = PaymentTransaction.builder()
                .paymentCode("PAY_SHIPPING_OLD")
                .trackingCode("WB_DUAL_001")
                .amount(BigDecimal.valueOf(35000))
                .paymentType(PaymentType.SHIPPING_FEE)
                .status(PaymentStatus.SUCCESS)
                .createdAt(LocalDateTime.now().minusHours(2))
                .build();

        PaymentTransaction newReturnPending = PaymentTransaction.builder()
                .paymentCode("PAY_RETURN_NEW")
                .trackingCode("WB_DUAL_001")
                .amount(BigDecimal.valueOf(17500))
                .paymentType(PaymentType.RETURN_FEE)
                .status(PaymentStatus.PENDING)
                .createdAt(LocalDateTime.now().minusMinutes(5))
                .build();

        when(paymentRepo.findByTrackingCodeOrderByCreatedAtDesc("WB_DUAL_001"))
                .thenReturn(List.of(newReturnPending, oldShippingSuccess));

        PaymentResponse latest = paymentService.getLatestByTrackingCode("WB_DUAL_001");

        assertNotNull(latest);
        assertEquals("PAY_RETURN_NEW", latest.getPaymentCode());
        assertEquals(PaymentType.RETURN_FEE, latest.getPaymentType());
        assertEquals(PaymentStatus.PENDING, latest.getStatus());
    }
}
