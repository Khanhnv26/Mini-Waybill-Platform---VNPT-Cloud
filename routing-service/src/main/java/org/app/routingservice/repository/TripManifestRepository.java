package org.app.routingservice.repository;

import org.app.routingservice.entity.TripManifest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TripManifestRepository extends JpaRepository<TripManifest, Long> {
    List<TripManifest> findByTripId(Long tripId);
    List<TripManifest> findByTripIdAndDestinationHub(Long tripId, String destinationHub);
    List<TripManifest> findByTripIdAndStatus(Long tripId, String status);
    boolean existsByTripIdAndTrackingCode(Long tripId, String trackingCode);
    boolean existsByTripIdAndTrackingCodeAndStatus(Long tripId, String trackingCode, String status);
    void deleteByTripIdAndTrackingCode(Long tripId, String trackingCode);
    long countByTripId(Long tripId);
    @Query("SELECT COALESCE(SUM(tm.weightKg), 0.0) FROM TripManifest tm WHERE tm.tripId = :tripId AND tm.status = 'LOADED'")
    Double sumActiveWeightByTripId(@Param("tripId") Long tripId);
    Optional<TripManifest> findByTrackingCodeAndStatus(String trackingCode, String status);
    List<TripManifest> findByTrackingCode(String trackingCode);
}
