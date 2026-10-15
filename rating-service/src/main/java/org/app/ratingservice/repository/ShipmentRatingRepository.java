package org.app.ratingservice.repository;

import org.app.ratingservice.entity.ShipmentRating;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ShipmentRatingRepository extends JpaRepository<ShipmentRating, Long>, JpaSpecificationExecutor<ShipmentRating> {

    Optional<ShipmentRating> findByTrackingCode(String trackingCode);

    boolean existsByTrackingCode(String trackingCode);

    long countByIsHiddenFalse();

    long countByIsHiddenTrue();

    @Query("SELECT AVG(CAST(r.serviceRating AS double)) FROM ShipmentRating r WHERE r.isHidden = false")
    Optional<Double> findAverageServiceRating();

    @Query("SELECT AVG(CAST(r.shipperRating AS double)) FROM ShipmentRating r WHERE r.isHidden = false")
    Optional<Double> findAverageShipperRating();

    @Query("SELECT COUNT(r) FROM ShipmentRating r WHERE (r.serviceRating <= 2 OR r.shipperRating <= 2) AND r.isHidden = false")
    long countNegativeRatings();

    @Query("SELECT r.serviceRating, COUNT(r) FROM ShipmentRating r WHERE r.isHidden = false GROUP BY r.serviceRating")
    List<Object[]> findServiceRatingDistribution();
}
