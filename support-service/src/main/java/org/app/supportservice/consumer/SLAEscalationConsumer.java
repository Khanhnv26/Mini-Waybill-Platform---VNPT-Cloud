package org.app.supportservice.consumer;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.app.supportservice.config.RabbitMQConfig;
import org.app.supportservice.entity.SupportTicket;
import org.app.supportservice.repository.SupportTicketRepository;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class SLAEscalationConsumer {

    private final SupportTicketRepository ticketRepository;

    @RabbitListener(queues = RabbitMQConfig.OUT_DATE_QUEUE)
    public void handleSLAEscalation(Long ticketId) {
        log.info(">>> Consumer nhận được tín hiệu hết hạn SLA cho Ticket ID: {}", ticketId);
        SupportTicket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy Ticket với ID: " + ticketId));

        if ("OPEN".equals(ticket.getStatus())) {
            ticket.setStatus("ESCALATED");
            ticketRepository.save(ticket);
            log.warn(" [CẢNH BÁO VI PHẠM SLA] Ticket [{}] - {} đã quá 2 phút chưa ai xử lý!", ticket.getTicketCode(), ticket.getTitle());
            log.warn(" Hệ thống tự động nâng trạng thái thành: ESCALATED để báo động cấp quản lý!");
        } else {
            log.info("Ticket [{}] - {} đã được xử lý trước khi hết hạn SLA. Trạng thái hiện tại: {}", ticket.getTicketCode(), ticket.getTitle(), ticket.getStatus());

        }
    }
}
