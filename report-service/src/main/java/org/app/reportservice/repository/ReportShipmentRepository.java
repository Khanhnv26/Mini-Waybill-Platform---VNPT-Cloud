package org.app.reportservice.repository;

import org.app.reportservice.entity.ReportShipmentSummary;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDateTime;
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
    """)
    BigDecimal sumShippingFee(
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to,
            @Param("customerId") Long customerId
    );


    @Query("""
        SELECT COALESCE(SUM(r.codAmount), 0) FROM ReportShipmentSummary r
        WHERE r.createdAt BETWEEN :from AND :to
          AND (:customerId IS NULL OR r.customerId = :customerId)
    """)
    BigDecimal sumCodAmount(
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to,
            @Param("customerId") Long customerId
    );


    @Query("""
        SELECT COUNT(r) FROM ReportShipmentSummary r
        WHERE r.createdAt BETWEEN :from AND :to
          AND (:customerId IS NULL OR r.customerId = :customerId)
          AND r.currentStatus = :status
    """)
    long countByStatus(
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to,
            @Param("customerId") Long customerId,
            @Param("status") String status
    );

    @Query("""
        SELECT COALESCE(SUM(r.codAmount), 0) FROM ReportShipmentSummary r
        WHERE r.createdAt BETWEEN :from AND :to
          AND (:customerId IS NULL OR r.customerId = :customerId)
          AND r.codSettlementStatus = 'SETTLED'
    """)
    BigDecimal sumSettledCodAmount(
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to,
            @Param("customerId") Long customerId
    );

    @Query("""
        SELECT COALESCE(SUM(r.codAmount), 0) FROM ReportShipmentSummary r
        WHERE r.createdAt BETWEEN :from AND :to
          AND (:customerId IS NULL OR r.customerId = :customerId)
          AND (r.codSettlementStatus IS NULL OR r.codSettlementStatus != 'SETTLED')
    """)
    BigDecimal sumPendingCodAmount(
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to,
            @Param("customerId") Long customerId
    );
}
