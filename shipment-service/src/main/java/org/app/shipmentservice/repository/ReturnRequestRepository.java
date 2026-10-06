package org.app.shipmentservice.repository;

import org.app.shipmentservice.entity.ReturnMode;
import org.app.shipmentservice.entity.ReturnRequest;
import org.app.shipmentservice.entity.ReturnRequestStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface ReturnRequestRepository extends JpaRepository<ReturnRequest, Long> {

    Optional<ReturnRequest> findByTrackingCode(String trackingCode);

    List<ReturnRequest> findByCustomerIdOrderByCreatedAtDesc(Long customerId);

    List<ReturnRequest> findByStatusOrderByCreatedAtDesc(ReturnRequestStatus status);

    List<ReturnRequest> findAllByOrderByCreatedAtDesc();

    boolean existsByTrackingCodeAndStatusNot(String trackingCode, ReturnRequestStatus status);

    List<ReturnRequest> findByReturnModeAndArrivedOriginAtIsNotNullAndPickupDeadlineBeforeAndStatus(
            ReturnMode returnMode, LocalDateTime deadline, ReturnRequestStatus status);
}
