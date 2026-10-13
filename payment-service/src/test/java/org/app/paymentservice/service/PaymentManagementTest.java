package org.app.paymentservice.service;

import org.app.paymentservice.dto.request.ConfirmCashRequest;
import org.app.paymentservice.dto.request.PaymentFilterRequest;
import org.app.paymentservice.dto.response.PaymentResponse;
import org.app.paymentservice.dto.response.PaymentStatsResponse;
import org.app.paymentservice.entity.PaymentMethod;
import org.app.paymentservice.entity.PaymentStatus;
import org.app.paymentservice.entity.PaymentTransaction;
import org.app.paymentservice.entity.PaymentType;
import org.app.paymentservice.repository.PaymentTransactionRepository;
import org.app.paymentservice.repository.WebhookLogRepository;
import org.app.paymentservice.service.impl.PaymentServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.kafka.core.KafkaTemplate;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PaymentManagementTest {

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

    @InjectMocks
    private PaymentServiceImpl paymentService;

    @BeforeEach
    void setUp() {
    }

    @Test
    @DisplayName("Xác nhận thu tiền mặt: Tạo giao dịch CASH thành công và phát Kafka event")
    void testConfirmCashPayment_Success() {
        String trackingCode = "WB_TEST_CASH_01";
        ConfirmCashRequest req = ConfirmCashRequest.builder()
                .trackingCode(trackingCode)
                .amount(BigDecimal.valueOf(150000))
                .paymentType(PaymentType.COD)
                .note("Thu tiền mặt tại quầy")
                .build();

        when(paymentRepo.findFirstByTrackingCodeAndStatusOrderByCreatedAtDesc(eq(trackingCode), eq(PaymentStatus.PENDING)))
                .thenReturn(Optional.empty());

        when(paymentRepo.save(any(PaymentTransaction.class))).thenAnswer(invocation -> {
            PaymentTransaction saved = invocation.getArgument(0);
            saved.setId(100L);
            return saved;
        });

        PaymentResponse response = paymentService.confirmCashPayment(req, "admin@waybill.vn");

        assertNotNull(response);
        assertEquals(trackingCode, response.getTrackingCode());
        assertEquals(PaymentStatus.SUCCESS, response.getStatus());
        assertEquals(PaymentMethod.CASH, response.getPaymentMethod());
        assertEquals(BigDecimal.valueOf(150000), response.getAmount());

        verify(kafkaTemplate, times(1)).send(eq("payment-success-events"), eq(trackingCode), any());
        verify(paymentRepo, times(1)).save(any(PaymentTransaction.class));
    }

    @Test
    @DisplayName("Lấy thống kê tài chính: Tính đúng tổng tiền COD, cước và số lượng giao dịch")
    void testGetStats_Success() {
        PaymentTransaction tx1 = PaymentTransaction.builder()
                .id(1L)
                .paymentCode("PAY_1")
                .trackingCode("WB1")
                .amount(BigDecimal.valueOf(200000))
                .paymentType(PaymentType.COD)
                .status(PaymentStatus.SUCCESS)
                .build();

        PaymentTransaction tx2 = PaymentTransaction.builder()
                .id(2L)
                .paymentCode("PAY_2")
                .trackingCode("WB2")
                .amount(BigDecimal.valueOf(35000))
                .paymentType(PaymentType.SHIPPING_FEE)
                .status(PaymentStatus.SUCCESS)
                .build();

        PaymentTransaction tx3 = PaymentTransaction.builder()
                .id(3L)
                .paymentCode("PAY_3")
                .trackingCode("WB3")
                .amount(BigDecimal.valueOf(500000))
                .paymentType(PaymentType.COD)
                .status(PaymentStatus.PENDING)
                .build();

        when(paymentRepo.findAll(any(Specification.class))).thenReturn(List.of(tx1, tx2, tx3));

        PaymentStatsResponse stats = paymentService.getStats(null, "admin", "ROLE_ADMIN");

        assertNotNull(stats);
        assertEquals(BigDecimal.valueOf(200000), stats.getTotalCodSuccess());
        assertEquals(BigDecimal.valueOf(35000), stats.getTotalShippingFeeSuccess());
        assertEquals(BigDecimal.valueOf(500000), stats.getTotalCodPending());
        assertEquals(1, stats.getPendingCount());
        assertEquals(2, stats.getSuccessCount());
        assertEquals(3, stats.getTotalCount());
    }

    @Test
    @DisplayName("Tra cứu danh sách có phân trang và lọc dữ liệu")
    void testGetTransactions_WithPagination() {
        PaymentTransaction tx = PaymentTransaction.builder()
                .id(1L)
                .paymentCode("PAY_TEST_01")
                .trackingCode("WB_TEST_01")
                .amount(BigDecimal.valueOf(100000))
                .paymentType(PaymentType.COD)
                .status(PaymentStatus.SUCCESS)
                .createdAt(LocalDateTime.now())
                .build();

        Page<PaymentTransaction> page = new PageImpl<>(List.of(tx));
        when(paymentRepo.findAll(any(Specification.class), any(Pageable.class))).thenReturn(page);

        PaymentFilterRequest filter = PaymentFilterRequest.builder()
                .keyword("WB_TEST")
                .status(PaymentStatus.SUCCESS)
                .page(0)
                .size(10)
                .build();

        Page<PaymentResponse> result = paymentService.getTransactions(filter, "admin", "ROLE_ADMIN");

        assertNotNull(result);
        assertEquals(1, result.getTotalElements());
        assertEquals("WB_TEST_01", result.getContent().get(0).getTrackingCode());
    }

    @Test
    @DisplayName("Test StringToLocalDateTimeConverter chuyển đổi linh hoạt các định dạng ISO date")
    void testStringToLocalDateTimeConverter() {
        org.app.paymentservice.config.WebConfig.StringToLocalDateTimeConverter converter =
                new org.app.paymentservice.config.WebConfig.StringToLocalDateTimeConverter();

        // 1. ISO UTC với đuôi Z
        LocalDateTime dt1 = converter.convert("2026-10-13T06:36:30.589Z");
        assertNotNull(dt1);

        // 2. ISO LocalDateTime chuẩn không có Z
        LocalDateTime dt2 = converter.convert("2026-10-13T13:36:30");
        assertNotNull(dt2);
        assertEquals(2026, dt2.getYear());
        assertEquals(10, dt2.getMonthValue());
        assertEquals(13, dt2.getDayOfMonth());
        assertEquals(13, dt2.getHour());

        // 3. Chỉ có ngày YYYY-MM-DD
        LocalDateTime dt3 = converter.convert("2026-10-13");
        assertNotNull(dt3);
        assertEquals(0, dt3.getHour());
        assertEquals(0, dt3.getMinute());

        // 4. Null hoặc rỗng
        assertNull(converter.convert(null));
        assertNull(converter.convert("   "));
        assertNull(converter.convert("invalid-date"));
    }
}
