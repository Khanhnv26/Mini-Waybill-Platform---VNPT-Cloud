package org.app.supportservice.repository;

import org.app.supportservice.entity.SupportTicket;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SupportTicketRepository extends JpaRepository<SupportTicket, Long> {
    Optional<SupportTicket> findByTicketCode(String ticketCode);
    List<SupportTicket> findByCreatorUserIdOrderByCreatedAtDesc(Long creatorUserId);
    List<SupportTicket> findByStatusOrderByCreatedAtDesc(String status);
    List<SupportTicket> findByTrackingCodeOrderByCreatedAtDesc(String trackingCode);
    List<SupportTicket> findAllByOrderByCreatedAtDesc();
}
