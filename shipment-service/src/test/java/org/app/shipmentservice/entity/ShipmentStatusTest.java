package org.app.shipmentservice.entity;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ShipmentStatusTest {

    @Test
    @DisplayName("Bưu tá đi phát (OUT_FOR_DELIVERY) có thể Giao thành công, Thất bại hoặc Chuyển hoàn")
    void testOutForDeliveryTransitions() {
        assertTrue(ShipmentStatus.OUT_FOR_DELIVERY.canTransitionTo(ShipmentStatus.DELIVERED));
        assertTrue(ShipmentStatus.OUT_FOR_DELIVERY.canTransitionTo(ShipmentStatus.DELIVERY_FAILED));
        assertTrue(ShipmentStatus.OUT_FOR_DELIVERY.canTransitionTo(ShipmentStatus.RETURNING),
                "Phát thất bại lần 3 phải cho phép chuyển thẳng sang RETURNING để đồng bộ từ tracking-service");
        assertFalse(ShipmentStatus.OUT_FOR_DELIVERY.canTransitionTo(ShipmentStatus.PICKED_UP));
    }

    @Test
    @DisplayName("Khách có thể yêu cầu hoàn từ các chặng đang luân chuyển: PICKED_UP, IN_TRANSIT, ARRIVED_DEST_HUB")
    void testInTransitReturningTransitions() {
        assertTrue(ShipmentStatus.PICKED_UP.canTransitionTo(ShipmentStatus.RETURNING));
        assertTrue(ShipmentStatus.IN_TRANSIT.canTransitionTo(ShipmentStatus.RETURNING));
        assertTrue(ShipmentStatus.ARRIVED_DEST_HUB.canTransitionTo(ShipmentStatus.RETURNING));
        assertTrue(ShipmentStatus.DELIVERY_FAILED.canTransitionTo(ShipmentStatus.RETURNING));
    }

    @Test
    @DisplayName("Trạng thái RETURNING có thể chuyển sang OUT_FOR_RETURN hoặc kết thúc bằng RETURNED")
    void testReturningTransitions() {
        assertTrue(ShipmentStatus.RETURNING.canTransitionTo(ShipmentStatus.OUT_FOR_RETURN));
        assertTrue(ShipmentStatus.RETURNING.canTransitionTo(ShipmentStatus.RETURNED));
        assertFalse(ShipmentStatus.RETURNING.canTransitionTo(ShipmentStatus.OUT_FOR_DELIVERY));
        assertFalse(ShipmentStatus.RETURNING.canTransitionTo(ShipmentStatus.DELIVERED));
    }

    @Test
    @DisplayName("Trạng thái RETURNED là điểm dừng bất biến")
    void testReturnedIsTerminal() {
        assertFalse(ShipmentStatus.RETURNED.canTransitionTo(ShipmentStatus.OUT_FOR_DELIVERY));
        assertFalse(ShipmentStatus.RETURNED.canTransitionTo(ShipmentStatus.DELIVERED));
        assertFalse(ShipmentStatus.RETURNED.canTransitionTo(ShipmentStatus.RETURNING));
    }
}
