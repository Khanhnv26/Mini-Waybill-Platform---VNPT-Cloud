package org.app.shipmentservice.consumer;

import org.app.sharedevents.entity.PaymentSuccessEvent;
import org.app.shipmentservice.entity.FeePaymentStatus;
import org.app.shipmentservice.entity.ReturnRequest;
import org.app.shipmentservice.entity.Shipment;
import org.app.shipmentservice.entity.ShipmentStatus;
import org.app.shipmentservice.repository.ReturnRequestRepository;
import org.app.shipmentservice.repository.ShipmentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PaymentSuccessConsumerTest {

    @Mock
    private ShipmentRepository shipmentRepository;

    @Mock
    private ReturnRequestRepository returnRequestRepository;

    @InjectMocks
    private PaymentSuccessConsumer consumer;

    private Shipment testShipment;
    private ReturnRequest testReturnRequest;

    @BeforeEach
    void setUp() {
        testShipment = Shipment.builder()
                .trackingCode("WB_RETURN_123")
                .currentStatus(ShipmentStatus.RETURNING)
                .build();

        testReturnRequest = ReturnRequest.builder()
                .trackingCode("WB_RETURN_123")
                .returnFee(BigDecimal.valueOf(17500))
                .feePaymentStatus(FeePaymentStatus.UNPAID)
                .build();
    }

    @Test
    @DisplayName("Nghiệm thu sự kiện RETURN_FEE: cập nhật feePaymentStatus sang PREPAID")
    void testHandleReturnFeeSuccess() {
        when(shipmentRepository.findShipmentByTrackingCode("WB_RETURN_123"))
                .thenReturn(Optional.of(testShipment));
        when(returnRequestRepository.findByTrackingCode("WB_RETURN_123"))
                .thenReturn(Optional.of(testReturnRequest));

        PaymentSuccessEvent event = PaymentSuccessEvent.builder()
                .trackingCode("WB_RETURN_123")
                .paymentType("RETURN_FEE")
                .amount(BigDecimal.valueOf(17500))
                .paidAt(LocalDateTime.now())
                .build();

        consumer.handlePaymentSuccess(event);

        ArgumentCaptor<ReturnRequest> captor = ArgumentCaptor.forClass(ReturnRequest.class);
        verify(returnRequestRepository, times(1)).save(captor.capture());
        assertEquals(FeePaymentStatus.PREPAID, captor.getValue().getFeePaymentStatus());
    }

    @Test
    @DisplayName("Bỏ qua thanh toán RETURN_FEE nếu đơn hàng đã bị hủy CANCELLED")
    void testIgnoreCancelledShipment() {
        testShipment.setCurrentStatus(ShipmentStatus.CANCELLED);
        when(shipmentRepository.findShipmentByTrackingCode("WB_RETURN_123"))
                .thenReturn(Optional.of(testShipment));

        PaymentSuccessEvent event = PaymentSuccessEvent.builder()
                .trackingCode("WB_RETURN_123")
                .paymentType("RETURN_FEE")
                .amount(BigDecimal.valueOf(17500))
                .build();

        consumer.handlePaymentSuccess(event);

        verify(returnRequestRepository, never()).save(any());
    }
}
