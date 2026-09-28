package org.app.paymentservice.repository;

import org.app.paymentservice.entity.PaymentStatus;
import org.app.paymentservice.entity.PaymentTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PaymentTransactionRepository extends JpaRepository<PaymentTransaction, Long> {

    Optional<PaymentTransaction> findByPaymentCode(String paymentCode);

    Optional<PaymentTransaction> findFirstByTrackingCodeAndStatusOrderByCreatedAtDesc(String trackingCode, PaymentStatus status);

    List<PaymentTransaction> findByTrackingCodeOrderByCreatedAtDesc(String trackingCode);

    boolean existsByPaymentCode(String paymentCode);
}
