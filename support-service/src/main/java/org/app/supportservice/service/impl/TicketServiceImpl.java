package org.app.supportservice.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.app.supportservice.client.ShipmentClient;
import org.app.supportservice.config.RabbitMQConfig;
import org.app.supportservice.dto.event.SendEmailEvent;
import org.app.supportservice.dto.request.AddMessageRequest;
import org.app.supportservice.dto.request.CreateTicketRequest;
import org.app.supportservice.dto.request.ResolveTicketRequest;
import org.app.supportservice.dto.response.MessageResponse;
import org.app.supportservice.dto.response.TicketResponse;
import org.app.supportservice.entity.SupportTicket;
import org.app.supportservice.entity.TicketMessage;
import org.app.supportservice.exception.BadRequestException;
import org.app.supportservice.exception.ResourceNotFoundException;
import org.app.supportservice.repository.SupportTicketRepository;
import org.app.supportservice.repository.TicketMessageRepository;
import org.app.supportservice.service.TicketService;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class TicketServiceImpl implements TicketService {

    private final SupportTicketRepository ticketRepository;
    private final TicketMessageRepository messageRepository;
    private final RabbitTemplate rabbitTemplate;
    private final ShipmentClient shipmentClient;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    @Override
    @Transactional
    public TicketResponse createTicket(CreateTicketRequest req, Long userId, String userEmail) {
        String ticketCode = nextTicketCode();

        SupportTicket ticket = SupportTicket.builder()
                .ticketCode(ticketCode)
                .trackingCode(req.getTrackingCode() != null && !req.getTrackingCode().isBlank()
                        ? req.getTrackingCode().trim().toUpperCase() : null)
                .creatorUserId(userId != null ? userId : 0L)
                .creatorName(req.getCreatorName() != null && !req.getCreatorName().isBlank()
                        ? req.getCreatorName() : "Khách hàng")
                .creatorPhone(req.getCreatorPhone() != null && !req.getCreatorPhone().isBlank()
                        ? req.getCreatorPhone() : "Chưa cập nhật")
                .creatorEmail(req.getCreatorEmail() != null && !req.getCreatorEmail().isBlank()
                        ? req.getCreatorEmail() : userEmail)
                .category(req.getCategory())
                .priority(req.getPriority() != null && !req.getPriority().isBlank()
                        ? req.getPriority().toUpperCase() : "NORMAL")
                .status("OPEN")
                .title(req.getTitle())
                .description(req.getDescription())
                .build();

        SupportTicket savedTicket = ticketRepository.save(ticket);

        int priorityScore = mapPriorityToScore(savedTicket.getPriority());
        rabbitTemplate.convertAndSend(RabbitMQConfig.EXCHANGE_PRIMARY, RabbitMQConfig.ROUTING_KEY_PRIMARY, savedTicket.getId(), message -> {
            message.getMessageProperties().setPriority(priorityScore);
            return message;
        });

        rabbitTemplate.convertAndSend(RabbitMQConfig.EXCHANGE_PRIMARY, RabbitMQConfig.ROUTING_KEY_SLA, savedTicket.getId());

        if (savedTicket.getCreatorEmail() != null && !savedTicket.getCreatorEmail().isBlank()) {
            SendEmailEvent welcomeEmail = SendEmailEvent.builder()
                    .toEmail(savedTicket.getCreatorEmail())
                    .subject("[VNPT Waybill] Tiếp nhận yêu cầu khiếu nại " + savedTicket.getTicketCode())
                    .body("Xin chào " + savedTicket.getCreatorName() + ",\n\n"
                            + "Yêu cầu khiếu nại của bạn về đơn hàng [" + savedTicket.getTrackingCode() + "] đã được tiếp nhận thành công.\n"
                            + "Mã phiếu hỗ trợ: " + savedTicket.getTicketCode() + "\n"
                            + "Đội ngũ CSKH đang xử lý và sẽ phản hồi sớm nhất.\n\nTrân trọng!")
                    .type("TICKET_CREATED")
                    .trackingCode(savedTicket.getTrackingCode())
                    .build();
            kafkaTemplate.send("email-events", savedTicket.getTicketCode(), welcomeEmail);
            log.info(">>> Đã phát sự kiện Kafka gửi email xác nhận tạo vé cho khách: {}", savedTicket.getCreatorEmail());
        }

        //Tự động tạo Message đầu tiên từ nội dung mô tả của khách
        TicketMessage initialMsg = TicketMessage.builder()
                .ticket(savedTicket)
                .senderId(userId != null ? userId : 0L)
                .senderName(savedTicket.getCreatorName())
                .senderRole("CUSTOMER")
                .content(req.getDescription())
                .createdAt(LocalDateTime.now())
                .build();
        messageRepository.save(initialMsg);

        savedTicket.getMessages().add(initialMsg);
        return TicketResponse.fromEntity(savedTicket);
    }

    @Override
    @Transactional(readOnly = true)
    public List<TicketResponse> getMyTickets(Long userId) {
        return ticketRepository.findByCreatorUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(TicketResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<TicketResponse> getAllTickets(String status, String trackingCode) {
        List<SupportTicket> list;
        if (trackingCode != null && !trackingCode.isBlank()) {
            list = ticketRepository.findByTrackingCodeOrderByCreatedAtDesc(trackingCode.trim().toUpperCase());
        } else if (status != null && !status.isBlank() && !"ALL".equalsIgnoreCase(status)) {
            list = ticketRepository.findByStatusOrderByCreatedAtDesc(status.toUpperCase());
        } else {
            list = ticketRepository.findAllByOrderByCreatedAtDesc();
        }
        return list.stream().map(TicketResponse::fromEntity).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public TicketResponse getTicketById(Long id) {
        SupportTicket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy ticket với ID: " + id));
        return TicketResponse.fromEntity(ticket);
    }

    @Override
    @Transactional(readOnly = true)
    public TicketResponse getTicketByCode(String ticketCode) {
        SupportTicket ticket = ticketRepository.findByTicketCode(ticketCode.trim().toUpperCase())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy ticket với mã: " + ticketCode));
        return TicketResponse.fromEntity(ticket);
    }

    @Override
    @Transactional
    public TicketResponse assignTicket(Long id, Long csUserId, String csName) {
        if (csUserId == null) {
            throw new BadRequestException("Không xác định được nhân viên tiếp nhận");
        }
        SupportTicket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy ticket với ID: " + id));
        ticket.setAssignedToUserId(csUserId);
        ticket.setAssignedToName(csName != null && !csName.isBlank() ? csName : "Nhân viên CSKH");
        ticket.setStatus("IN_PROGRESS");
        SupportTicket updated = ticketRepository.save(ticket);
        return TicketResponse.fromEntity(updated);
    }

    @Override
    @Transactional
    public TicketResponse resolveTicket(Long id, ResolveTicketRequest req) {
        SupportTicket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy ticket với ID: " + id));
        ticket.setStatus(req.getStatus() != null && !req.getStatus().isBlank() ? req.getStatus() : "RESOLVED");
        ticket.setResolutionNote(req.getResolutionNote());
        if (req.getCompensationAmount() != null) {
            ticket.setCompensationAmount(req.getCompensationAmount());
        }
        ticket.setClosedAt(LocalDateTime.now());
        SupportTicket updated = ticketRepository.save(ticket);

        if(updated.getTrackingCode() != null && !updated.getTrackingCode().isBlank()) {
            String category = updated.getCategory() != null ? updated.getCategory().toUpperCase() : "";
            if ("DAMAGED_GOODS".equals(category) || "LOST_GOODS".equals(category) || "CANCEL_REQUEST".equals(category)) {
                try {
                    Map<String, String> cancelReq = Map.of(
                            "reasonCode", "CSKH_RESOLVED",
                            "reasonNote", "Hủy theo khiếu nại " + updated.getTicketCode() + ": " + updated.getResolutionNote()
                    );
                    shipmentClient.cancelShipment(updated.getTrackingCode(), cancelReq, "ROLE_CS", "SHIPMENT:CANCEL");
                    log.info(">>> Đã tự động kích hoạt HỦY ĐƠN HÀNG [{}] bên shipment-service!", updated.getTrackingCode());
                } catch (Exception e) {
                    log.warn("Không thể tự động hủy đơn bên shipment-service: {}", e.getMessage());
                }

            }
        }

        return TicketResponse.fromEntity(updated);
    }

    @Override
    @Transactional
    public MessageResponse addMessage(Long id, AddMessageRequest req, Long senderId, String senderRole) {
        SupportTicket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy ticket với ID: " + id));

        String status = ticket.getStatus() == null ? "" : ticket.getStatus().trim().toUpperCase(Locale.ROOT);
        if ("RESOLVED".equals(status) || "CLOSED".equals(status)) {
            throw new BadRequestException("Phiếu đã được giải quyết, không thể gửi thêm tin nhắn");
        }

        TicketMessage msg = TicketMessage.builder()
                .ticket(ticket)
                .senderId(senderId != null ? senderId : 0L)
                .senderName(req.getSenderName() != null && !req.getSenderName().isBlank()
                        ? req.getSenderName() : "Người dùng")
                .senderRole(senderRole != null ? senderRole : "CUSTOMER")
                .content(req.getContent())
                .attachmentUrls(req.getAttachmentUrls())
                .createdAt(LocalDateTime.now())
                .build();

        TicketMessage saved = messageRepository.save(msg);
        return MessageResponse.fromEntity(saved);
    }

    private String nextTicketCode() {
        String dateStr = LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE);
        for (int attempt = 0; attempt < 5; attempt++) {
            int randomNum = 1000 + ThreadLocalRandom.current().nextInt(9000);
            String candidate = "TKT-" + dateStr + "-" + randomNum;
            if (!ticketRepository.existsByTicketCode(candidate)) {
                return candidate;
            }
        }
        throw new BadRequestException("Không sinh được mã phiếu duy nhất. Vui lòng thử lại");
    }

    private int mapPriorityToScore(String priority) {
        if (priority == null) return 4;
        return switch(priority.toUpperCase()) {
            case "URGENT", "CRITICAL" -> 9;
            case "HIGH" -> 7;
            case "NORMAL", "MEDIUM" -> 4;
            case "LOW" -> 2;
            default -> 4;
        };
    }


}
