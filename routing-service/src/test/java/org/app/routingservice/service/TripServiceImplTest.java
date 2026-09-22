package org.app.routingservice.service;

import org.app.routingservice.dto.trip.TripDetailResponse;
import org.app.routingservice.entity.Trip;
import org.app.routingservice.entity.TripManifest;
import org.app.routingservice.entity.TripStop;
import org.app.routingservice.repository.*;
import org.app.routingservice.service.TripService;
import org.app.routingservice.service.impl.TripServiceImpl;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.kafka.core.KafkaTemplate;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TripServiceImplTest {

    @Mock
    private TripRepository tripRepository;

    @Mock
    private TripStopRepository tripStopRepository;

    @Mock
    private TripManifestRepository tripManifestRepository;

    @Mock
    private HubRepository hubRepository;

    @Mock
    private RoutingAssignmentRepository routingAssignmentRepository;

    @Mock
    private KafkaTemplate<String, Object> kafkaTemplate;

    @Mock
    private SchedulerConfigRepository schedulerConfigRepository;

    @Mock
    private ObjectProvider<TripService> tripServiceProvider;

    @InjectMocks
    private TripServiceImpl tripService;

    private Trip createMockTrip(String status) {
        return Trip.builder()
                .id(1L)
                .tripCode("TRIP-HN-HCM-001")
                .routeName("Tuyến Trục Hà Nội - TP.HCM")
                .vehiclePlate("29C-999.88")
                .driverName("Nguyễn Văn Lái")
                .currentHub("HUB-HN-01")
                .status(status)
                .maxWeight(30000.0)
                .currentWeight(5000.0)
                .totalShipments(10)
                .stops(new ArrayList<>())
                .build();
    }

    private List<TripStop> createMockStops(Trip trip) {
        TripStop stop1 = TripStop.builder().id(1L).trip(trip).hubCode("HUB-HN-01").stopOrder(1).status("DEPARTED").build();
        TripStop stop2 = TripStop.builder().id(2L).trip(trip).hubCode("HUB-DN-01").stopOrder(2).status("PENDING").build();
        TripStop stop3 = TripStop.builder().id(3L).trip(trip).hubCode("HUB-HCM-01").stopOrder(3).status("PENDING").build();
        return List.of(stop1, stop2, stop3);
    }

    @Test
    @DisplayName("Chặn cập bến khi chuyến xe chưa xuất bến (status != IN_TRANSIT)")
    void arriveAtStop_TripNotStarted_ShouldThrowException() {
        Trip trip = createMockTrip("SCHEDULED");
        when(tripRepository.findById(1L)).thenReturn(Optional.of(trip));

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                tripService.arriveAtStop(1L, "HUB-DN-01")
        );
        assertTrue(ex.getMessage().contains("chưa xuất bến"));
    }

    @Test
    @DisplayName("Chặn cập bến tại trạm xuất phát (StopOrder = 1 / DEPARTED)")
    void arriveAtStop_ArriveAtOriginStop_ShouldThrowException() {
        Trip trip = createMockTrip("IN_TRANSIT");
        List<TripStop> stops = createMockStops(trip);

        when(tripRepository.findById(1L)).thenReturn(Optional.of(trip));
        when(tripStopRepository.findByTripIdOrderByStopOrder(1L)).thenReturn(stops);

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                tripService.arriveAtStop(1L, "HUB-HN-01")
        );
        assertTrue(ex.getMessage().contains("Trạm xuất phát"));
    }

    @Test
    @DisplayName("Chặn cập bến nhảy cóc: Chưa qua Đà Nẵng (Stop 2) mà đòi cập bến TP.HCM (Stop 3)")
    void arriveAtStop_SkipIntermediateStop_ShouldThrowException() {
        Trip trip = createMockTrip("IN_TRANSIT");
        List<TripStop> stops = createMockStops(trip); // stop2 is PENDING

        when(tripRepository.findById(1L)).thenReturn(Optional.of(trip));
        when(tripStopRepository.findByTripIdOrderByStopOrder(1L)).thenReturn(stops);

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                tripService.arriveAtStop(1L, "HUB-HCM-01")
        );
        assertTrue(ex.getMessage().contains("chưa hoàn tất tại trạm trung gian trước đó"));
    }

    @Test
    @DisplayName("Chặn cập bến trùng lặp khi trạm đó đã ở trạng thái ARRIVED")
    void arriveAtStop_DuplicateArrival_ShouldThrowException() {
        Trip trip = createMockTrip("IN_TRANSIT");
        List<TripStop> stops = List.of(
                TripStop.builder().id(1L).trip(trip).hubCode("HUB-HN-01").stopOrder(1).status("DEPARTED").build(),
                TripStop.builder().id(2L).trip(trip).hubCode("HUB-DN-01").stopOrder(2).status("ARRIVED").build(),
                TripStop.builder().id(3L).trip(trip).hubCode("HUB-HCM-01").stopOrder(3).status("PENDING").build()
        );

        when(tripRepository.findById(1L)).thenReturn(Optional.of(trip));
        when(tripStopRepository.findByTripIdOrderByStopOrder(1L)).thenReturn(stops);

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                tripService.arriveAtStop(1L, "HUB-DN-01")
        );
        assertTrue(ex.getMessage().contains("đã cập bến tại trạm"));
    }

    @Test
    @DisplayName("Cập nhật tiến độ bằng mã trạm tự động tính % và tọa độ không cần nhập số")
    void updateProgress_WithLocationCodeOnly_ShouldAutoCalculate() {
        Trip trip = createMockTrip("IN_TRANSIT");
        trip.setProgressPercent(0.0);
        List<TripStop> stops = createMockStops(trip);
        org.app.routingservice.entity.Hub mockHub = org.app.routingservice.entity.Hub.builder()
                .hubCode("HUB-DN-01")
                .hubName("Kho Tổng Đà Nẵng")
                .latitude(16.0544)
                .longitude(108.2021)
                .build();

        when(tripRepository.findById(1L)).thenReturn(Optional.of(trip));
        when(tripStopRepository.findByTripIdOrderByStopOrder(1L)).thenReturn(stops);
        when(hubRepository.findByHubCode("HUB-DN-01")).thenReturn(Optional.of(mockHub));
        when(tripRepository.save(any(Trip.class))).thenAnswer(invocation -> invocation.getArgument(0));

        org.app.routingservice.dto.trip.TripProgressRequest request = org.app.routingservice.dto.trip.TripProgressRequest.builder()
                .locationCode("HUB-DN-01")
                .note("Đang di chuyển tới trạm Đà Nẵng")
                .build();

        TripDetailResponse response = tripService.updateProgress(1L, request, "admin-1", "ROLE_ADMIN", "routing:trip_manage");

        assertNotNull(response);
        assertEquals("HUB-DN-01", trip.getCurrentHub());
        assertEquals(50.0, trip.getProgressPercent()); // stop 2 of 3 -> (2-1)/(3-1) = 50%
        assertEquals(16.0544, trip.getCurrentLatitude());
        assertEquals(108.2021, trip.getCurrentLongitude());
    }

    @Test
    @DisplayName("Quá cut-off thì gom tự động không nạp thêm và đếm 0 kiện mới")
    void autoConsolidate_afterCutoff_addsNothing() {
        Trip trip = createMockTrip("SCHEDULED");
        trip.setCutoffTime(LocalDateTime.now().minusMinutes(1));
        when(tripRepository.findById(1L)).thenReturn(Optional.of(trip));
        when(tripRepository.save(any(Trip.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(tripStopRepository.findByTripIdOrderByStopOrder(1L)).thenReturn(List.of());
        when(tripManifestRepository.findByTripId(1L)).thenReturn(List.of(
                TripManifest.builder().tripId(1L).trackingCode("WB001").status("LOADED").weightKg(1.0).build()));

        TripDetailResponse response = tripService.autoConsolidate(1L, null);

        assertEquals(0, response.getNewlyAddedCount());
        assertTrue(trip.getReadyToDepart());
        verify(tripManifestRepository, never()).save(any(TripManifest.class));
    }

    @Test
    @DisplayName("Quét toàn bộ cộng số kiện mới thêm, xe xuất bến sớm được gom trước")
    void consolidateAllScheduledTrips_sumsNewlyAddedNotExistingManifests() {
        Trip sooner = createMockTrip("SCHEDULED");
        sooner.setScheduledDepartureTime(LocalDateTime.now().plusHours(1));
        Trip later = createMockTrip("SCHEDULED");
        later.setId(2L);
        later.setTripCode("TRIP-2");
        later.setScheduledDepartureTime(LocalDateTime.now().plusHours(5));
        when(tripRepository.findByStatus("SCHEDULED")).thenReturn(List.of(later, sooner));

        TripService self = mock(TripService.class);
        when(tripServiceProvider.getObject()).thenReturn(self);
        when(self.autoConsolidate(1L, null)).thenReturn(TripDetailResponse.builder()
                .newlyAddedCount(2)
                .manifests(List.of(
                        TripDetailResponse.ManifestItemResponse.builder().trackingCode("A").build(),
                        TripDetailResponse.ManifestItemResponse.builder().trackingCode("B").build(),
                        TripDetailResponse.ManifestItemResponse.builder().trackingCode("C").build(),
                        TripDetailResponse.ManifestItemResponse.builder().trackingCode("D").build(),
                        TripDetailResponse.ManifestItemResponse.builder().trackingCode("E").build()))
                .build());
        when(self.autoConsolidate(2L, null)).thenReturn(TripDetailResponse.builder()
                .newlyAddedCount(1)
                .manifests(List.of(
                        TripDetailResponse.ManifestItemResponse.builder().trackingCode("F").build(),
                        TripDetailResponse.ManifestItemResponse.builder().trackingCode("G").build()))
                .build());

        assertEquals(3, tripService.consolidateAllScheduledTrips());

        InOrder order = inOrder(self);
        order.verify(self).autoConsolidate(1L, null);
        order.verify(self).autoConsolidate(2L, null);
    }
}
