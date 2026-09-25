package org.app.ratingservice.repository;

import org.app.ratingservice.entity.ShipmentRating;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ShipmentRatingRepository extends JpaRepository<ShipmentRating, Long> {
    
    Optional<ShipmentRating> findByTrackingCode(String trackingCode);

    boolean existsByTrackingCode(String trackingCode);
    
}
