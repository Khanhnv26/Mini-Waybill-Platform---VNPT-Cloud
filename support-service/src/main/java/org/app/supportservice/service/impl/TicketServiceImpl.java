package org.app.supportservice.service.impl;

import lombok.RequiredArgsConstructor;
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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.ThreadLocalRandom;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TicketServiceImpl implements TicketService {

    private final SupportTicketRepository ticketRepository;
    private final TicketMessageRepository messageRepository;

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
}
