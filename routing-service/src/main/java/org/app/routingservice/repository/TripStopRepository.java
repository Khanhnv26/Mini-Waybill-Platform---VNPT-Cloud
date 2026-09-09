package org.app.routingservice.repository;

import org.app.routingservice.entity.TripStop;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TripStopRepository extends JpaRepository<TripStop, Long> {

}
