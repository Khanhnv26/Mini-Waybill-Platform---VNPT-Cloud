package org.app.ratingservice.service.impl;

import org.app.ratingservice.client.ShipmentClient;
import org.app.ratingservice.client.TrackingClient;
import org.app.ratingservice.dto.request.CreateRatingRequest;
import org.app.ratingservice.entity.ShipmentRating;
import org.app.ratingservice.repository.ShipmentRatingRepository;
import org.app.sharedevents.entity.ShipmentFeedbackEvent;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.concurrent.CompletableFuture;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class RatingServiceImplTest {

    private ShipmentRatingRepository shipmentRatingRepository;
    private ShipmentClient shipmentClient;
    private TrackingClient trackingClient;
    private KafkaTemplate<String, Object> kafkaTemplate;
    private RatingServiceImpl ratingService;

    @SuppressWarnings("unchecked")
    @BeforeEach
    void setUp() {
        shipmentRatingRepository = mock(ShipmentRatingRepository.class);
        shipmentClient = mock(ShipmentClient.class);
        trackingClient = mock(TrackingClient.class);
        kafkaTemplate = mock(KafkaTemplate.class);
        ratingService = new RatingServiceImpl(shipmentRatingRepository, shipmentClient, trackingClient, kafkaTemplate);
    }

    @Test
    void submitRatingUsesHandedOffCourierCodeInFeedbackEvent() {
        when(shipmentRatingRepository.existsByTrackingCode("WB123")).thenReturn(false);
        when(shipmentClient.getShipmentByCode("WB123")).thenReturn(ShipmentClient.ShipmentDetailDto.builder()
                .trackingCode("WB123")
                .currentStatus("DELIVERED")
                .receiverPhone("+84 912 345 678")
                .build());

        TrackingClient.TrackingHistoryDto handoff = new TrackingClient.TrackingHistoryDto();
        handoff.setOperationType("HANDED_TO_COURIER");
        handoff.setActorId("SHIPPER-42");
        when(trackingClient.getTrackingHistory("WB123")).thenReturn(List.of(handoff));
        when(shipmentRatingRepository.save(any(ShipmentRating.class))).thenAnswer(invocation -> {
            ShipmentRating rating = invocation.getArgument(0);
            rating.setId(15L);
            return rating;
        });
        when(kafkaTemplate.send(anyString(), anyString(), any()))
                .thenReturn(CompletableFuture.completedFuture(null));

        ratingService.submitRating(CreateRatingRequest.builder()
                .trackingCode("wb123")
                .serviceRating(5)
                .shipperRating(4)
                .verifiedPhone("5678")
                .build());

        ArgumentCaptor<ShipmentRating> ratingCaptor = ArgumentCaptor.forClass(ShipmentRating.class);
        verify(shipmentRatingRepository).save(ratingCaptor.capture());
        assertThat(ratingCaptor.getValue().getCourierCode()).isEqualTo("SHIPPER-42");

        ArgumentCaptor<Object> eventCaptor = ArgumentCaptor.forClass(Object.class);
        verify(kafkaTemplate).send(eq(RatingServiceImpl.TOPIC_FEEDBACK), eq("WB123"), eventCaptor.capture());
        assertThat(eventCaptor.getValue()).isInstanceOf(ShipmentFeedbackEvent.class);
        assertThat(((ShipmentFeedbackEvent) eventCaptor.getValue()).getCourierCode()).isEqualTo("SHIPPER-42");
    }

    @Test
    void submitRatingRejectsIncorrectPhoneVerification() {
        when(shipmentRatingRepository.existsByTrackingCode("WB123")).thenReturn(false);
        when(shipmentClient.getShipmentByCode("WB123")).thenReturn(ShipmentClient.ShipmentDetailDto.builder()
                .trackingCode("WB123")
                .currentStatus("DELIVERED")
                .receiverPhone("+84 912 345 678")
                .build());

        assertThatThrownBy(() -> ratingService.submitRating(CreateRatingRequest.builder()
                .trackingCode("WB123")
                .serviceRating(5)
                .shipperRating(4)
                .verifiedPhone("9999")
                .build()))
                .isInstanceOf(ResponseStatusException.class);

        verify(shipmentRatingRepository, never()).save(any(ShipmentRating.class));
        verify(kafkaTemplate, never()).send(anyString(), anyString(), any());
    }
}
