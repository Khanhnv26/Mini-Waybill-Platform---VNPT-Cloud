package org.app.routingservice.service;

import org.app.routingservice.client.ShipperClient;
import org.app.routingservice.dto.eta.EtaCalculationRequest;
import org.app.routingservice.dto.eta.EtaCalculationResponse;
import org.app.routingservice.dto.operation.StationCapacityDto;
import org.app.routingservice.entity.Hub;
import org.app.routingservice.entity.Trip;
import org.app.routingservice.repository.HubRepository;
import org.app.routingservice.repository.TripRepository;
import org.app.routingservice.repository.VehicleRepository;
import org.app.routingservice.service.impl.DeliveryEtaServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DeliveryEtaServiceTest {

    @Mock
    private TripRepository tripRepository;

    @Mock
    private VehicleRepository vehicleRepository;

    @Mock
    private ShipperClient shipperClient;

    @Mock
    private HubRepository hubRepository;

    @InjectMocks
    private DeliveryEtaServiceImpl deliveryEtaService;

    private Hub hnHub;
    private Hub hcmHub;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(deliveryEtaService, "cutOffHour", 18);
        ReflectionTestUtils.setField(deliveryEtaService, "pickupBufferHours", 2);
        ReflectionTestUtils.setField(deliveryEtaService, "lastMileHours", 4);
        ReflectionTestUtils.setField(deliveryEtaService, "truckSpeedKmh", 55.0);

        hnHub = Hub.builder()
                .hubCode("HUB-HN-01")
                .hubName("Siêu Hub Hà Nội")
                .province("Hà Nội")
                .latitude(21.0285)
                .longitude(105.8542)
                .build();

        hcmHub = Hub.builder()
                .hubCode("HUB-HCM-01")
                .hubName("Siêu Hub TP.HCM")
                .province("Hồ Chí Minh")
                .latitude(10.8231)
                .longitude(106.6297)
                .build();
    }

    @Test
    @DisplayName("Tính ETA thành công khi tìm thấy chuyến xe khả dụng")
    void testCalculateDeliveryEta_WithAvailableTrip() {
        when(hubRepository.findByHubCode("HUB-HN-01")).thenReturn(Optional.of(hnHub));
        when(hubRepository.findByHubCode("HUB-HCM-01")).thenReturn(Optional.of(hcmHub));
        when(vehicleRepository.countByCurrentHubAndStatus(eq("HUB-HN-01"), eq("AVAILABLE"))).thenReturn(3L);

        LocalDateTime departure = LocalDateTime.now().plusHours(3);
        Trip trip = Trip.builder()
                .tripCode("TRP-HN-HCM-01")
                .vehiclePlate("29H-882.11")
                .scheduledDepartureTime(departure)
                .build();

        when(tripRepository.findAvailableTrips(eq("HUB-HN-01"), anyDouble(), any(LocalDateTime.class)))
                .thenReturn(List.of(trip));

        when(shipperClient.getStationCapacity("HUB-HCM-01")).thenReturn(
                StationCapacityDto.builder()
                        .stationCode("HUB-HCM-01")
                        .availableCapacity(35)
                        .isOverLoaded(false)
                        .build()
        );

        EtaCalculationRequest request = EtaCalculationRequest.builder()
                .originHub("HUB-HN-01")
                .destinationHub("HUB-HCM-01")
                .weight(2.5)
                .createdAt(LocalDateTime.now())
                .build();

        EtaCalculationResponse response = deliveryEtaService.calculateDeliveryEta(request);

        assertNotNull(response);
        assertEquals("TRP-HN-HCM-01", response.getAssignedTripCode());
        assertEquals("29H-882.11", response.getVehiclePlate());
        assertNotNull(response.getEstimatedDeliveryTime());
        assertNotNull(response.getEstimatedDeliveryMax());
        assertNotNull(response.getDisplayDateRange());
        assertNotNull(response.getDisplayCommitmentTime());
        assertFalse(response.getIsFleetConstrained());
    }

    @Test
    @DisplayName("Tính ETA fallback theo SLA khi không có chuyến xe sẵn trong DB")
    void testCalculateDeliveryEta_NoTripFallback() {
        when(hubRepository.findByHubCode("HUB-HN-01")).thenReturn(Optional.of(hnHub));
        when(hubRepository.findByHubCode("HUB-HCM-01")).thenReturn(Optional.of(hcmHub));
        when(vehicleRepository.countByCurrentHubAndStatus(eq("HUB-HN-01"), eq("AVAILABLE"))).thenReturn(2L);

        when(tripRepository.findAvailableTrips(eq("HUB-HN-01"), anyDouble(), any(LocalDateTime.class)))
                .thenReturn(List.of());

        when(shipperClient.getStationCapacity("HUB-HCM-01")).thenReturn(
                StationCapacityDto.builder()
                        .stationCode("HUB-HCM-01")
                        .availableCapacity(20)
                        .isOverLoaded(false)
                        .build()
        );

        EtaCalculationRequest request = EtaCalculationRequest.builder()
                .originHub("HUB-HN-01")
                .destinationHub("HUB-HCM-01")
                .weight(1.0)
                .build();

        EtaCalculationResponse response = deliveryEtaService.calculateDeliveryEta(request);

        assertNotNull(response);
        assertNull(response.getAssignedTripCode(), "Không có xe thì tripCode phải là null để Staff điều phối");
        assertNotNull(response.getEstimatedDeliveryTime());
        assertNotNull(response.getDisplayDateRange());
    }

    @Test
    @DisplayName("Cộng thêm 24h khi bưu cục đích hết shipper hoặc quá tải")
    void testCalculateDeliveryEta_OverloadedDestHub() {
        when(hubRepository.findByHubCode("HUB-HN-01")).thenReturn(Optional.of(hnHub));
        when(hubRepository.findByHubCode("HUB-HCM-01")).thenReturn(Optional.of(hcmHub));
        when(vehicleRepository.countByCurrentHubAndStatus(eq("HUB-HN-01"), eq("AVAILABLE"))).thenReturn(1L);

        when(tripRepository.findAvailableTrips(eq("HUB-HN-01"), anyDouble(), any(LocalDateTime.class)))
                .thenReturn(List.of());

        // Bưu cục đích quá tải: availableCapacity = 0, isOverloaded = true
        when(shipperClient.getStationCapacity("HUB-HCM-01")).thenReturn(
                StationCapacityDto.builder()
                        .stationCode("HUB-HCM-01")
                        .availableCapacity(0)
                        .isOverLoaded(true)
                        .build()
        );

        EtaCalculationRequest request = EtaCalculationRequest.builder()
                .originHub("HUB-HN-01")
                .destinationHub("HUB-HCM-01")
                .weight(3.0)
                .build();

        EtaCalculationResponse response = deliveryEtaService.calculateDeliveryEta(request);

        assertNotNull(response);
        assertTrue(response.getEstimatedDeliveryTime().isAfter(LocalDateTime.now().plusHours(36)));
    }
}
