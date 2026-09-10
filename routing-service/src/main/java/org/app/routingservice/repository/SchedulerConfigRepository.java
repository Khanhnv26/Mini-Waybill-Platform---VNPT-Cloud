package org.app.routingservice.repository;

import org.app.routingservice.entity.SchedulerConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SchedulerConfigRepository extends JpaRepository<SchedulerConfig, Long> {
}
