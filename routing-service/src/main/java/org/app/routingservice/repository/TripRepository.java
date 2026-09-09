package org.app.routingservice.repository;

import org.app.routingservice.entity.Trip;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TripRepository extends JpaRepository<Trip, Long> {

    Optional<Trip> findByTripCode(String tripCode);

    List<Trip> findAllByOrderByCreatedAtDesc();

    List<Trip> findByStatus(String status);

    boolean existsByTripCode(String tripCode);

}
