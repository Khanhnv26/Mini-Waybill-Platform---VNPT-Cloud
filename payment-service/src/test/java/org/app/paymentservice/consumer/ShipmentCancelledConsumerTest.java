package org.app.paymentservice.consumer;

import org.app.paymentservice.dto.event.ShipmentStatusUpdatedEvent;
import org.app.paymentservice.entity.PaymentStatus;
import org.app.paymentservice.entity.PaymentTransaction;
import org.app.paymentservice.repository.PaymentTransactionRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ShipmentCancelledConsumerTest {

    @Mock
    private PaymentTransactionRepository paymentTransactionRepository;

    @InjectMocks
    private ShipmentCancelledConsumer consumer;

    @Test
    void huyDonThiHoanTienGiaoDichSuccess() {
        PaymentTransaction tx = PaymentTransaction.builder()
                .paymentCode("PAY_WB123")
                .trackingCode("WB123")
                .status(PaymentStatus.SUCCESS)
                .build();
        when(paymentTransactionRepository.findByTrackingCodeOrderByCreatedAtDesc("WB123"))
                .thenReturn(List.of(tx));

        consumer.handleCancelledShipment(ShipmentStatusUpdatedEvent.builder()
                .trackingCode("WB123")
                .status("CANCELLED")
                .build());

        assertThat(tx.getStatus()).isEqualTo(PaymentStatus.CANCELLED);
        verify(paymentTransactionRepository).save(tx);
    }

    @Test
    void boQuaEventKhongPhaiHuyDon() {
        consumer.handleCancelledShipment(ShipmentStatusUpdatedEvent.builder()
                .trackingCode("WB123")
                .status("DELIVERED")
                .build());

        verifyNoInteractions(paymentTransactionRepository);
    }

    @Test
    void boQuaKhiKhongCoGiaoDichSuccess() {
        PaymentTransaction pending = PaymentTransaction.builder()
                .paymentCode("PAY_WB123")
                .trackingCode("WB123")
                .status(PaymentStatus.PENDING)
                .build();
        when(paymentTransactionRepository.findByTrackingCodeOrderByCreatedAtDesc("WB123"))
                .thenReturn(List.of(pending));

        consumer.handleCancelledShipment(ShipmentStatusUpdatedEvent.builder()
                .trackingCode("WB123")
                .status("CANCELLED")
                .build());

        assertThat(pending.getStatus()).isEqualTo(PaymentStatus.PENDING);
        verify(paymentTransactionRepository, never()).save(any());
    }
}
