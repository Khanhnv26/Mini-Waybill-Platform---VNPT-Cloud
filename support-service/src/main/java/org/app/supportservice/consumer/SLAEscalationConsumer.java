package org.app.supportservice.consumer;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.app.supportservice.config.RabbitMQConfig;
import org.app.supportservice.dto.event.SendEmailEvent;
import org.app.supportservice.entity.SupportTicket;
import org.app.supportservice.repository.SupportTicketRepository;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class SLAEscalationConsumer {

    @Value("${app.sla.alert-email:vankhanhak54@gmail.com}")
    private String alertEmailTo;

    private final SupportTicketRepository ticketRepository;
    private final KafkaTemplate<String, Object> kafkaTemplate;

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
            SendEmailEvent alertEmail = SendEmailEvent.builder()
                    .toEmail(alertEmailTo) // Email của Quản lý
                    .subject("[CẢNH BÁO KHẨN CẤP] Vi phạm SLA Ticket: " + ticket.getTicketCode())
                    .body("Kính gửi Quản lý ca trực,\n\nKhiếu nại mã " + ticket.getTicketCode()
                            + " với tiêu đề '" + ticket.getTitle() + "' đã quá 2 phút chưa có nhân viên CSKH tiếp nhận!\n"
                            + "Hệ thống đã tự động nâng trạng thái lên ESCALATED. Đề nghị kiểm tra và xử lý ngay!")
                    .type("SLA_BREACH_ALERT")
                    .trackingCode(ticket.getTrackingCode())
                    .build();
            kafkaTemplate.send("email-events", ticket.getTicketCode(), alertEmail);
            log.info(">>> Đã phát sự kiện Kafka cảnh báo vi phạm SLA sang notification-service!");
        } else {
            log.info("Ticket [{}] - {} đã được xử lý trước khi hết hạn SLA. Trạng thái hiện tại: {}", ticket.getTicketCode(), ticket.getTitle(), ticket.getStatus());

        }
    }
}
