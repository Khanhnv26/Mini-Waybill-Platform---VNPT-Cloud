package org.app.reportservice.repository;

import org.app.reportservice.entity.ReportShipmentSummary;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface ReportShipmentRepository extends JpaRepository<ReportShipmentSummary, Long> {

    Optional<ReportShipmentSummary> findByTrackingCode(String trackingCode);


    @Query("""
        SELECT r FROM ReportShipmentSummary r
        WHERE r.createdAt BETWEEN :from AND :to
          AND (:customerId IS NULL OR r.customerId = :customerId)
          AND (:status IS NULL OR :status = 'ALL' OR r.currentStatus = :status)
        ORDER BY r.createdAt DESC
    """)
    Page<ReportShipmentSummary> findByFilters (
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to,
            @Param("customerId") Long customerId,
            @Param("status") String status,
            Pageable pageable
    );


    @Query("""
        SELECT r FROM ReportShipmentSummary r
        WHERE r.createdAt BETWEEN :from AND :to
          AND (:customerId IS NULL OR r.customerId = :customerId)
          AND (:status IS NULL OR :status = 'ALL' OR r.currentStatus = :status)
        ORDER BY r.createdAt DESC
    """)
    List<ReportShipmentSummary> findAllByFilters(
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to,
            @Param("customerId") Long customerId,
            @Param("status") String status
    );

    @Query("""
        SELECT COALESCE(SUM(r.shippingFee), 0) FROM ReportShipmentSummary r
        WHERE r.createdAt BETWEEN :from AND :to
          AND (:customerId IS NULL OR r.customerId = :customerId)
          AND (:status IS NULL OR :status = 'ALL' OR r.currentStatus = :status)
    """)
    BigDecimal sumShippingFee(
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to,
            @Param("customerId") Long customerId,
            @Param("status") String status
    );


    @Query("""
        SELECT COALESCE(SUM(r.codAmount), 0) FROM ReportShipmentSummary r
        WHERE r.createdAt BETWEEN :from AND :to
          AND (:customerId IS NULL OR r.customerId = :customerId)
          AND (:status IS NULL OR :status = 'ALL' OR r.currentStatus = :status)
    """)
    BigDecimal sumCodAmount(
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to,
            @Param("customerId") Long customerId,
            @Param("status") String status
    );


    @Query("""
        SELECT COUNT(r) FROM ReportShipmentSummary r
        WHERE r.createdAt BETWEEN :from AND :to
          AND (:customerId IS NULL OR r.customerId = :customerId)
          AND (:status IS NULL OR :status = 'ALL' OR r.currentStatus = :status)
          AND r.currentStatus = :exactStatus
    """)
    long countByStatus(
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to,
            @Param("customerId") Long customerId,
            @Param("status") String status,
            @Param("exactStatus") String exactStatus
    );

    @Query("""
        SELECT COUNT(r) FROM ReportShipmentSummary r
        WHERE r.createdAt BETWEEN :from AND :to
          AND (:customerId IS NULL OR r.customerId = :customerId)
          AND (:status IS NULL OR :status = 'ALL' OR r.currentStatus = :status)
          AND r.currentStatus IN :statuses
    """)
    long countInStatuses(
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to,
            @Param("customerId") Long customerId,
            @Param("status") String status,
            @Param("statuses") Collection<String> statuses
    );

    @Query("""
        SELECT YEAR(r.createdAt), MONTH(r.createdAt), DAY(r.createdAt),
               COALESCE(SUM(r.shippingFee), 0), COALESCE(SUM(r.codAmount), 0), COUNT(r)
        FROM ReportShipmentSummary r
        WHERE r.createdAt BETWEEN :from AND :to
          AND (:customerId IS NULL OR r.customerId = :customerId)
          AND (:status IS NULL OR :status = 'ALL' OR r.currentStatus = :status)
        GROUP BY YEAR(r.createdAt), MONTH(r.createdAt), DAY(r.createdAt)
        ORDER BY YEAR(r.createdAt), MONTH(r.createdAt), DAY(r.createdAt)
    """)
    List<Object[]> sumByDay(
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to,
            @Param("customerId") Long customerId,
            @Param("status") String status
    );

    @Query("""
        SELECT COUNT(r) FROM ReportShipmentSummary r
        WHERE r.createdAt BETWEEN :from AND :to
          AND (:customerId IS NULL OR r.customerId = :customerId)
          AND (:status IS NULL OR :status = 'ALL' OR r.currentStatus = :status)
    """)
    long countTotalOrders(
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to,
            @Param("customerId") Long customerId,
            @Param("status") String status
    );

    @Query("""
        SELECT COALESCE(SUM(r.codAmount), 0) FROM ReportShipmentSummary r
        WHERE r.createdAt BETWEEN :from AND :to
          AND (:customerId IS NULL OR r.customerId = :customerId)
          AND (:status IS NULL OR :status = 'ALL' OR r.currentStatus = :status)
          AND r.codSettlementStatus = 'SETTLED'
    """)
    BigDecimal sumSettledCodAmount(
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to,
            @Param("customerId") Long customerId,
            @Param("status") String status
    );

    @Query("""
        SELECT COALESCE(SUM(r.codAmount), 0) FROM ReportShipmentSummary r
        WHERE r.createdAt BETWEEN :from AND :to
          AND (:customerId IS NULL OR r.customerId = :customerId)
          AND (:status IS NULL OR :status = 'ALL' OR r.currentStatus = :status)
          AND r.codSettlementStatus = 'PENDING_SETTLEMENT'
    """)
    BigDecimal sumPendingCodAmount(
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to,
            @Param("customerId") Long customerId,
            @Param("status") String status
    );
}
