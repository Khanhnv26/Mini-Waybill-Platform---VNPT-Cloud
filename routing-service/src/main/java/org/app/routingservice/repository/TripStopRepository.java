package org.app.routingservice.repository;

import org.app.routingservice.entity.TripStop;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import javax.swing.text.html.Option;
import java.util.List;
import java.util.Optional;

@Repository
public interface TripStopRepository extends JpaRepository<TripStop, Long> {

    List<TripStop> findByTripIdOrderByStopOrder(Long tripId);

    Optional<TripStop> findByTripIdAndHubCode(Long tripId, String hubCode);

    Optional<TripStop> findByTripIdAndStopOrder(Long tripId, Integer stopOrder);

}
