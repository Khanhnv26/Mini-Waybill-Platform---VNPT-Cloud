package org.app.routingservice.repository;

import io.lettuce.core.dynamic.annotation.Param;
import org.app.routingservice.entity.Trip;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface TripRepository extends JpaRepository<Trip, Long> {

    Optional<Trip> findByTripCode(String tripCode);

    List<Trip> findAllByOrderByCreatedAtDesc();

    List<Trip> findByStatus(String status);

    boolean existsByTripCode(String tripCode);

    @Query("""                                                 
        SELECT t FROM Trip t
        WHERE t.currentHub = :originHub
          AND t.status = 'SCHEDULED'
          AND (t.maxWeight - t.currentWeight) >= :weight
          AND t.scheduledDepartureTime >= :afterTime
        ORDER BY t.scheduledDepartureTime ASC
    """)
    List<Trip> findAvailableTrips(
            @Param("originHub") String originHub,
            @Param("weight") double weight,
            @Param("afterTime") LocalDateTime afterTime);
}
