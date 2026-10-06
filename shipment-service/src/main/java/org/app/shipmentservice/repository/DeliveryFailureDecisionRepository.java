package org.app.shipmentservice.repository;

import org.app.shipmentservice.entity.DeliveryFailureDecision;
import org.app.shipmentservice.entity.FailureDecisionType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface DeliveryFailureDecisionRepository extends JpaRepository<DeliveryFailureDecision, Long> {

    List<DeliveryFailureDecision> findByTrackingCodeOrderByAttemptNoDesc(String trackingCode);

    Optional<DeliveryFailureDecision> findTopByTrackingCodeOrderByAttemptNoDesc(String trackingCode);

    List<DeliveryFailureDecision> findByCustomerIdAndDecisionOrderByCreatedAtDesc(
            Long customerId, FailureDecisionType decision);

    List<DeliveryFailureDecision> findByDecisionAndDecisionDeadlineBefore(
            FailureDecisionType decision, LocalDateTime deadline);

    Optional<DeliveryFailureDecision> findByTrackingCodeAndDecision(
            String trackingCode, FailureDecisionType decision);
}
