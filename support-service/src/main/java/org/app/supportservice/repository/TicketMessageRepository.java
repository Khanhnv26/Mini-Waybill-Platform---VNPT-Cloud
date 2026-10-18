package org.app.supportservice.repository;

import org.app.supportservice.entity.TicketMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TicketMessageRepository extends JpaRepository<TicketMessage, Long> {
    java.util.Optional<TicketMessage> findByTicketIdAndClientMessageId(Long ticketId, String clientMessageId);
    List<TicketMessage> findByTicketIdAndIdGreaterThanOrderByIdAsc(Long ticketId, Long id, org.springframework.data.domain.Pageable page);
    List<TicketMessage> findByTicketIdAndIdLessThanOrderByIdDesc(Long ticketId, Long id, org.springframework.data.domain.Pageable page);
    List<TicketMessage> findByAudienceKeyInOrderByIdDesc(List<String> keys, org.springframework.data.domain.Pageable page);
    @org.springframework.data.jpa.repository.Query("select m.ticket.id, count(m) from TicketMessage m left join ChatReadState r on r.ticketId = m.ticket.id and r.readerKey = :readerKey where (:staff = true or m.ticket.creatorUserId = :userId) and m.id > coalesce(r.lastReadMessageId, 0) and (:staff = false or m.senderRole = 'CUSTOMER') and (:staff = true or m.senderRole <> 'CUSTOMER') group by m.ticket.id")
    List<Object[]> unreadSummary(@org.springframework.data.repository.query.Param("readerKey") String readerKey,
            @org.springframework.data.repository.query.Param("userId") Long userId,
            @org.springframework.data.repository.query.Param("staff") boolean staff);
    @org.springframework.data.jpa.repository.Query("select count(m) from TicketMessage m where m.ticket.id = :ticketId and m.id > :afterId and coalesce(m.senderKey, '') <> :readerKey and (:staff = false or m.senderRole = 'CUSTOMER') and (:staff = true or m.senderRole <> 'CUSTOMER')")
    long unread(@org.springframework.data.repository.query.Param("ticketId") Long ticketId,
                @org.springframework.data.repository.query.Param("afterId") Long afterId,
                @org.springframework.data.repository.query.Param("readerKey") String readerKey,
                @org.springframework.data.repository.query.Param("staff") boolean staff);
    List<TicketMessage> findByTicketIdOrderByCreatedAtAsc(Long ticketId);
}
