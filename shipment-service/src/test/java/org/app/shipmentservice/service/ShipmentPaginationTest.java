package org.app.shipmentservice.service;

import org.app.shipmentservice.client.*;
import org.app.shipmentservice.entity.*;
import org.app.shipmentservice.exception.ForbiddenException;
import org.app.shipmentservice.repository.*;
import org.app.shipmentservice.service.impl.ShipmentServiceImpl;
import org.app.shipmentservice.pricing.service.TariffPricingService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.test.util.ReflectionTestUtils;
import jakarta.persistence.EntityManager;
import tools.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@DataJpaTest(properties = {"spring.datasource.url=jdbc:h2:mem:shipment_page;MODE=MSSQLServer;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver", "spring.datasource.username=sa", "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=create-drop", "spring.flyway.enabled=false", "spring.jpa.show-sql=false"})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class ShipmentPaginationTest {
    @Autowired ShipmentRepository shipments;
    @Autowired EntityManager entityManager;

    @Test void pagingSearchAndTotalsStayWithinTheAuthenticatedCustomersScope() {
        for (int i = 0; i < 4; i++) {
            shipments.save(Shipment.builder().trackingCode("WB" + i).customerId(i == 3 ? 200L : 100L)
                    .senderName("Sender").senderPhone("0900000000").senderAddress("Sender address")
                    .receiverName("Receiver").receiverPhone("0911111111").receiverAddress("Receiver address")
                    .serviceType(ServiceType.STANDARD).weight(1.0).codAmount(BigDecimal.valueOf(100))
                    .shippingFee(BigDecimal.TEN).totalFee(BigDecimal.TEN).currentStatus(ShipmentStatus.DELIVERED)
                    .codSettlementStatus(CodSettlementStatus.UNSETTLED).createdAt(LocalDateTime.now().minusMinutes(i)).build());
        }
        shipments.flush();
        StringRedisTemplate redis = mock(StringRedisTemplate.class);
        @SuppressWarnings("unchecked") ValueOperations<String, String> values = mock(ValueOperations.class);
        when(redis.opsForValue()).thenReturn(values);
        when(values.get("customer:user_id_map:7")).thenReturn("100");
        @SuppressWarnings("unchecked") KafkaTemplate<String, Object> kafka = mock(KafkaTemplate.class);
        ShipmentServiceImpl service = new ShipmentServiceImpl(shipments, mock(CustomerClient.class), redis, kafka,
                mock(HubClient.class), mock(TariffPricingService.class), mock(OutboxEventRepository.class),
                new ObjectMapper(), mock(RoutingClient.class), mock(EtaRecalculationService.class));
        ReflectionTestUtils.setField(service, "entityManager", entityManager);
        var first = service.getShipmentPage(null, "7", "shipment:read_own", 0, 2, null, "ALL");
        assertEquals(3, first.totalElements());
        assertEquals(2, first.totalPages());
        assertEquals(2, first.content().size());
        assertTrue(first.content().stream().allMatch(s -> s.getCustomerId().equals(100L)));
        assertEquals(3L, first.stats().get("total"));
        assertEquals(0, ((BigDecimal) first.stats().get("totalCod")).compareTo(BigDecimal.valueOf(300)));
        var second = service.getShipmentPage(null, "7", "shipment:read_own", 1, 2, "Receiver", "DELIVERED");
        assertEquals(1, second.content().size());
        assertNotEquals(first.content().getFirst().getId(), second.content().getFirst().getId());
        assertThrows(ForbiddenException.class, () -> service.getShipmentPage(200L, "7", "shipment:read_own", 0, 20, null, null));
    }
}
