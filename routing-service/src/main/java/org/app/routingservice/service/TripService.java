package org.app.routingservice.service;

import org.app.routingservice.dto.trip.ConsolidateRequest;
import org.app.routingservice.dto.trip.CreateTripRequest;
import org.app.routingservice.dto.trip.TripDetailResponse;
import org.app.routingservice.dto.trip.TripProgressRequest;
import org.app.routingservice.entity.Trip;

import org.app.routingservice.dto.trip.EligibleAssignmentResponse;

import java.util.List;

public interface TripService {
    TripDetailResponse createTrip(CreateTripRequest request);
    TripDetailResponse getTripDetail(Long tripId);
    List<TripDetailResponse> getAllTrips();
    TripDetailResponse autoConsolidate(Long tripId, ConsolidateRequest request);
    TripDetailResponse removeManifestItem(Long tripId, String trackingCode);
    TripDetailResponse departTrip(Long tripId);
    TripDetailResponse arriveAtStop(Long tripId, String hubCode);
    int consolidateAllScheduledTrips();
    List<EligibleAssignmentResponse> getEligibleAssignmentsForTrip(Long tripId);
    TripDetailResponse updateProgress(Long tripId, TripProgressRequest request, String actorId, String roles, String permissions);
}

