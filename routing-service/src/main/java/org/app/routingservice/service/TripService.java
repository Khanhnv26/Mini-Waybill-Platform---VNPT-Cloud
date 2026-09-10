package org.app.routingservice.service;

import org.app.routingservice.dto.trip.ConsolidateRequest;
import org.app.routingservice.dto.trip.CreateTripRequest;
import org.app.routingservice.dto.trip.TripDetailResponse;
import org.app.routingservice.entity.Trip;

import java.util.List;

public interface TripService {
    TripDetailResponse createTrip(CreateTripRequest request);
    TripDetailResponse getTripDetail(Long tripId);
    List<TripDetailResponse> getAllTrips();
    TripDetailResponse autoConsolidate(Long tripId, ConsolidateRequest request);
    TripDetailResponse removeManifestItem(Long tripId, String trackingCode);
    TripDetailResponse departTrip(Long tripId);
    TripDetailResponse arriveAtStop(Long tripId, String hubCode);
}

