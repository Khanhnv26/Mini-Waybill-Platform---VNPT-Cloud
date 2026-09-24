package org.app.routingservice.dto.event;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.assertEquals;

class ShipmentStatusUpdatedEventJsonTest {

    private final ObjectMapper kafkaMapper = new ObjectMapper()
            .registerModule(new JavaTimeModule());

    @Test
    void readsNumericTimestampArrayFromShipmentAndTracking() throws Exception {
        kafkaMapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        String fromShipment = """
                {"trackingCode":"WB1","status":"CANCELLED","updateAt":[2026,9,24,10,15,30]}
                """;
        String fromTracking = """
                {"trackingCode":"WB1","status":"CANCELLED","updatedAt":[2026,9,24,10,15,30]}
                """;

        ObjectMapper arrayReader = new ObjectMapper().registerModule(new JavaTimeModule());
        ShipmentStatusUpdatedEvent byUpdateAt = arrayReader.readValue(fromShipment, ShipmentStatusUpdatedEvent.class);
        ShipmentStatusUpdatedEvent byUpdatedAt = arrayReader.readValue(fromTracking, ShipmentStatusUpdatedEvent.class);

        LocalDateTime expected = LocalDateTime.of(2026, 9, 24, 10, 15, 30);
        assertEquals(expected, byUpdateAt.getUpdateAt());
        assertEquals("CANCELLED", byUpdateAt.getStatus());
        assertEquals(expected, byUpdatedAt.getUpdateAt());
    }

    @Test
    void readsIsoStringAndWritesBothPropertyNames() throws Exception {
        kafkaMapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        String iso = """
                {"trackingCode":"WB1","status":"CANCELLED","updateAt":"2026-09-24T10:15:30"}
                """;
        ShipmentStatusUpdatedEvent event = kafkaMapper.readValue(iso, ShipmentStatusUpdatedEvent.class);
        assertEquals(LocalDateTime.of(2026, 9, 24, 10, 15, 30), event.getUpdateAt());

        String written = kafkaMapper.writeValueAsString(event);
        assertEquals(event.getUpdateAt(), kafkaMapper.readTree(written).get("updateAt") != null
                ? kafkaMapper.readValue(written, ShipmentStatusUpdatedEvent.class).getUpdateAt()
                : null);
        ShipmentStatusUpdatedEvent roundTrip = kafkaMapper.readValue(written, ShipmentStatusUpdatedEvent.class);
        assertEquals(event.getUpdateAt(), roundTrip.getUpdatedAt());
    }
}
