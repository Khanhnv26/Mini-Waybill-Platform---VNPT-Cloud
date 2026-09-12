package org.app.routingservice.repository;

import org.app.routingservice.entity.RoutingAssignment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RoutingAssignmentRepository extends JpaRepository<RoutingAssignment, Long> {
    List<RoutingAssignment> findByStatus(String status);
    Optional<RoutingAssignment> findByTrackingCode(String trackingCode);
}
