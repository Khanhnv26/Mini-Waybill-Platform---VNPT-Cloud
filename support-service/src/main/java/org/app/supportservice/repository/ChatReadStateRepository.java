package org.app.supportservice.repository;

import org.app.supportservice.entity.ChatReadState;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ChatReadStateRepository extends JpaRepository<ChatReadState, String> {
    List<ChatReadState> findByTicketId(Long ticketId);
}
