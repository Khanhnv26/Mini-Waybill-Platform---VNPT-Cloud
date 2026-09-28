package org.app.paymentservice.repository;

import org.app.paymentservice.entity.WebhookLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface WebhookLogRepository extends JpaRepository<WebhookLog, Long> {

    List<WebhookLog> findByGatewayNameOrderByReceivedAtDesc(String gatewayName);

    List<WebhookLog> findByIsProcessedFalse();
}
