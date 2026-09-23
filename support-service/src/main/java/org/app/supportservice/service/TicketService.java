package org.app.supportservice.service;

import org.app.supportservice.dto.request.AddMessageRequest;
import org.app.supportservice.dto.request.CreateTicketRequest;
import org.app.supportservice.dto.request.ResolveTicketRequest;
import org.app.supportservice.dto.response.MessageResponse;
import org.app.supportservice.dto.response.TicketResponse;

import java.util.List;

public interface TicketService {
    TicketResponse createTicket(CreateTicketRequest req, Long userId, String userEmail);
    List<TicketResponse> getMyTickets(Long userId);
    List<TicketResponse> getAllTickets(String status, String trackingCode);
    TicketResponse getTicketById(Long id);
    TicketResponse assignTicket(Long id, Long csUserId, String csName);
    TicketResponse resolveTicket(Long id, ResolveTicketRequest req);
    MessageResponse addMessage(Long id, AddMessageRequest req, Long senderId, String senderRole);
}
