package org.app.trackingservice.entity;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class ShipmentStatusTest {

    @Test
    @DisplayName("Đơn vừa tạo (CREATED) chỉ được phép chuyển sang PENDING_ROUTING")
    void testCreatedTransition() {
        assertTrue(ShipmentStatus.CREATED.canTransitionTo(ShipmentStatus.PENDING_ROUTING));
        assertFalse(ShipmentStatus.CREATED.canTransitionTo(ShipmentStatus.DELIVERED), "Không được nhảy cóc sang DELIVERED");
        assertFalse(ShipmentStatus.CREATED.canTransitionTo(ShipmentStatus.IN_TRANSIT), "Không được nhảy cóc sang IN_TRANSIT");
    }

    @Test
    @DisplayName("Bưu tá đi phát (OUT_FOR_DELIVERY) có thể Giao thành công hoặc Thất bại")
    void testOutForDeliveryTransition() {
        assertTrue(ShipmentStatus.OUT_FOR_DELIVERY.canTransitionTo(ShipmentStatus.DELIVERED));
        assertTrue(ShipmentStatus.OUT_FOR_DELIVERY.canTransitionTo(ShipmentStatus.DELIVERY_FAILED));
        assertFalse(ShipmentStatus.OUT_FOR_DELIVERY.canTransitionTo(ShipmentStatus.PICKED_UP), "Không được lùi về PICKED_UP");
        assertFalse(ShipmentStatus.OUT_FOR_DELIVERY.canTransitionTo(ShipmentStatus.IN_TRANSIT), "Không được lùi về IN_TRANSIT");
    }

    @Test
    @DisplayName("Đơn đã giao thành công (DELIVERED) TUYỆT ĐỐI không được chuyển đi đâu nữa")
    void testDeliveredIsFinalState() {
        assertFalse(ShipmentStatus.DELIVERED.canTransitionTo(ShipmentStatus.IN_TRANSIT), "Không được lùi về IN_TRANSIT");
        assertFalse(ShipmentStatus.DELIVERED.canTransitionTo(ShipmentStatus.OUT_FOR_DELIVERY), "Không được lùi về OUT_FOR_DELIVERY");
        assertFalse(ShipmentStatus.DELIVERED.canTransitionTo(ShipmentStatus.DELIVERED), "Không được cập nhật lại chính nó");
    }

    @Test
    @DisplayName("Giao thất bại (DELIVERY_FAILED) chỉ được phép xếp lịch phát lại (OUT_FOR_DELIVERY)")
    void testDeliveryFailedRetry() {
        assertTrue(ShipmentStatus.DELIVERY_FAILED.canTransitionTo(ShipmentStatus.OUT_FOR_DELIVERY));
        assertFalse(ShipmentStatus.DELIVERY_FAILED.canTransitionTo(ShipmentStatus.DELIVERED), "Thất bại không thể nhảy ngay lên DELIVERED");
        assertFalse(ShipmentStatus.DELIVERY_FAILED.canTransitionTo(ShipmentStatus.IN_TRANSIT), "Không được lùi về IN_TRANSIT");
    }
}
