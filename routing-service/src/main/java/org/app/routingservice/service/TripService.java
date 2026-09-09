package org.app.routingservice.service;

import org.app.routingservice.dto.trip.ConsolidateRequest;
import org.app.routingservice.dto.trip.CreateTripRequest;
import org.app.routingservice.dto.trip.TripDetailResponse;

public interface TripService {
    TripDetailResponse createTrip(CreateTripRequest request);
    TripDetailResponse getTripDetail(Long tripId);
    TripDetailResponse autoConsolidate(Long tripId, ConsolidateRequest request);
    TripDetailResponse removeManifestItem(Long tripId, String trackingCode);
}

