package org.app.routingservice.dto.trip;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.app.routingservice.entity.Trip;

import java.time.LocalDateTime;
import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class TripDetailResponse {

    private Long id;
    private String tripCode;
    private String routeName;
    private String vehiclePlate;
    private String driverName;
    private Double maxWeight;
    private Double currentWeight;
    private Integer totalShipments;
    private String currentHub;
    private String status;
    private LocalDateTime departureTime;
    private LocalDateTime scheduledDepartureTime;
    private LocalDateTime cutoffTime;
    private Boolean readyToDepart;
    private Boolean isOverdue;
    private LocalDateTime createdAt;
    private Double weightPercentage;
    private List<StopItemResponse> stops;
    private List<ManifestItemResponse> manifests;

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    @Builder
    public static class StopItemResponse {
        private Integer stopOrder;
        private String hubCode;
        private String hubName;
        private String hubAddress;
        private Double latitude;
        private Double longitude;
        private String status;
        private LocalDateTime arrivedAt;
        private LocalDateTime departedAt;
    }

    @AllArgsConstructor
    @NoArgsConstructor
    @Builder
    @Data
    public static class ManifestItemResponse {
        private String trackingCode;
        private String originHub;
        private String originHubName;
        private String originHubAddress;
        private String destinationHub;
        private String destinationHubName;
        private String destinationHubAddress;
        private Double weightKg;
        private String serviceType;
        private String status;
        private LocalDateTime loadedAt;
        private LocalDateTime unloadedAt;

    }


}
