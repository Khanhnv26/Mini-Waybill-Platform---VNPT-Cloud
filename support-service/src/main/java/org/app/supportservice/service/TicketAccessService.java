package org.app.supportservice.service;

import lombok.RequiredArgsConstructor;
import org.app.supportservice.entity.SupportTicket;
import org.app.supportservice.repository.SupportTicketRepository;
import org.app.supportservice.exception.ResourceNotFoundException;
import org.app.sharedevents.security.RoleAccess;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

@Service
@RequiredArgsConstructor
public class TicketAccessService {
    private final SupportTicketRepository tickets;

    public void check(Long ticketId, Long userId, String roles, String guestToken) {
        check(tickets.findById(ticketId).orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy phiếu")),
                userId, roles, guestToken);
    }

    public void checkCode(String code, Long userId, String roles, String guestToken) {
        check(tickets.findByTicketCode(code.trim().toUpperCase(java.util.Locale.ROOT))
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy phiếu")), userId, roles, guestToken);
    }

    public void check(SupportTicket ticket, Long userId, String roles, String guestToken) {
        if (userId != null && userId > 0 && (userId.equals(ticket.getCreatorUserId())
                || RoleAccess.hasAny(roles, "ADMIN", "CS"))) return;
        if (Long.valueOf(0).equals(ticket.getCreatorUserId()) && guestToken != null && guestToken.length() <= 128
                && ticket.getGuestAccessHash() != null && MessageDigest.isEqual(
                ticket.getGuestAccessHash().getBytes(StandardCharsets.UTF_8), hash(guestToken).getBytes(StandardCharsets.UTF_8))) return;
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không có quyền truy cập phiếu này");
    }

    public static String hash(String token) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                .digest(token.getBytes(StandardCharsets.UTF_8))); }
        catch (NoSuchAlgorithmException e) { throw new IllegalStateException(e); }
    }
}
