package org.app.shipmentservice.repository;

import org.app.shipmentservice.entity.OutBoxEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OutboxEventRepository extends JpaRepository<OutBoxEvent, Long> {

    List<OutBoxEvent> findTop50ByStatusOrderByCreatedAtAsc(String status);

}
