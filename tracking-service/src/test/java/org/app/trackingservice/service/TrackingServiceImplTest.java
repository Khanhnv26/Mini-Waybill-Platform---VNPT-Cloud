package org.app.trackingservice.service;

import org.app.trackingservice.dto.request.UpdateStatusRequest;
import org.app.trackingservice.entity.ShipmentStatus;
import org.app.trackingservice.entity.TrackingHistory;
import org.app.trackingservice.exception.ForbiddenException;
import org.app.trackingservice.exception.InvalidStateTransitionException;
import org.app.trackingservice.repository.TrackingHistoryRepository;
import org.app.trackingservice.service.impl.TrackingServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.kafka.core.KafkaTemplate;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TrackingServiceImplTest {

    @Mock
    private TrackingHistoryRepository trackingHistoryRepository;

    @Mock
    private StringRedisTemplate redisTemplate;

    @Mock
    private ValueOperations<String, String> valueOperations;

    @Mock
    private KafkaTemplate<String, Object> kafkaTemplate;

    @InjectMocks
    private TrackingServiceImpl trackingService;

    private final String TRACKING_CODE = "WB123456";

    @BeforeEach
    void setUp() {
        lenient().when(redisTemplate.opsForValue()).thenReturn(valueOperations);
    }

    @Test
    @DisplayName("Cập nhật hợp lệ: OUT_FOR_DELIVERY -> DELIVERED (Lưu DB, ghi Redis, bắn Kafka)")
    void updateStatus_ValidTransition_ShouldSucceed() {
        when(valueOperations.get("shipment-status:" + TRACKING_CODE)).thenReturn("OUT_FOR_DELIVERY");

        TrackingHistory mockSaved = TrackingHistory.builder()
                .id(1L)
                .trackingCode(TRACKING_CODE)
                .status("DELIVERED")
                .locationCode("HUB_HN")
                .node("Giao thành công")
                .occurredAt(LocalDateTime.now())
                .build();
        when(trackingHistoryRepository.save(any(TrackingHistory.class))).thenReturn(mockSaved);

        UpdateStatusRequest request = UpdateStatusRequest.builder()
                .status("DELIVERED")
                .locationCode("HUB_HN")
                .note("Giao thành công")
                .build();

        TrackingHistory result = trackingService.updateStatus(TRACKING_CODE, request, "1", "tracking:update");

        assertNotNull(result);
        assertEquals("DELIVERED", result.getStatus());

        verify(trackingHistoryRepository, times(1)).save(any(TrackingHistory.class));
        verify(valueOperations, times(1)).set(eq("shipment-status:" + TRACKING_CODE), eq("DELIVERED"), any(java.time.Duration.class));
        verify(kafkaTemplate, times(1)).send(eq("tracking-status-events"), eq(TRACKING_CODE), any());
    }

    @Test
    @DisplayName("Vi phạm luồng: DELIVERED -> IN_TRANSIT (Chặn đứng, không lưu DB, không bắn Kafka)")
    void updateStatus_InvalidTransition_ShouldThrowException() {
        when(valueOperations.get("shipment-status:" + TRACKING_CODE)).thenReturn("DELIVERED");

        UpdateStatusRequest request = UpdateStatusRequest.builder()
                .status("IN_TRANSIT")
                .build();

        InvalidStateTransitionException exception = assertThrows(
                InvalidStateTransitionException.class,
                () -> trackingService.updateStatus(TRACKING_CODE, request, "1", "tracking:update")
        );

        assertEquals(ShipmentStatus.DELIVERED, exception.getFromStatus());
        assertEquals(ShipmentStatus.IN_TRANSIT, exception.getToStatus());

        verify(trackingHistoryRepository, never()).save(any());
        verify(kafkaTemplate, never()).send(any(), any(), any());
    }

    @Test
    @DisplayName("Trạng thái không hợp lệ: Gửi chuỗi rác ABCXYZ -> Bị từ chối")
    void updateStatus_InvalidStatusName_ShouldThrowException()  {

        UpdateStatusRequest request = UpdateStatusRequest.builder()
                .status("ABCXYZ")
                .build();

        assertThrows(RuntimeException.class, () -> trackingService.updateStatus(TRACKING_CODE, request, "1", "tracking:update"));

        verify(trackingHistoryRepository, never()).save(any());
        verify(kafkaTemplate, never()).send(any(), any(), any());
    }

    @Test
    @DisplayName("ROLE_HUB_OPERATOR vi phạm quyền: Cập nhật OUT_FOR_DELIVERY -> Bị chặn 403 Forbidden")
    void updateStatus_HubOperatorForbiddenStatus_ShouldThrowException() {
        UpdateStatusRequest request = UpdateStatusRequest.builder()
                .status("OUT_FOR_DELIVERY")
                .build();

        assertThrows(ForbiddenException.class, () -> 
            trackingService.updateStatus(TRACKING_CODE, request, "ROLE_HUB_OPERATOR", "tracking:update_hub")
        );
    }

    @Test
    @DisplayName("ROLE_POST_OFFICE_OPERATOR vi phạm quyền: Cập nhật DELIVERED trực tiếp -> Bị chặn 403 Forbidden")
    void updateStatus_PostOfficeOperatorForbiddenStatus_ShouldThrowException() {
        UpdateStatusRequest request = UpdateStatusRequest.builder()
                .status("DELIVERED")
                .build();

        assertThrows(ForbiddenException.class, () -> 
            trackingService.updateStatus(TRACKING_CODE, request, "ROLE_POST_OFFICE_OPERATOR", "tracking:update_post_office")
        );
    }
}
