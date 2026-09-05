package org.app.routingservice.repository;

import org.app.routingservice.entity.Hub;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface HubRepository extends JpaRepository<Hub,Long> {
    Optional<Hub> findByHubCode(String hubCode);
    Optional<Hub> findByProvinceIgnoreCase(String province);
}
