package org.app.supportservice.repository;

import org.app.supportservice.entity.ChatOutbox;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDateTime;
import java.util.List;

public interface ChatOutboxRepository extends JpaRepository<ChatOutbox, Long> {
    List<ChatOutbox> findTop20ByDeliveredFalseAndNextAttemptAtLessThanEqualOrderByMessageIdAsc(LocalDateTime now);
}
