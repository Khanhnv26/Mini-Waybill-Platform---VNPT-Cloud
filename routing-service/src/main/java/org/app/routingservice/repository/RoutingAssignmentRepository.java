package org.app.routingservice.repository;

import org.app.routingservice.entity.RoutingAssignment;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RoutingAssignmentRepository extends JpaRepository<RoutingAssignment, Long> {
}
