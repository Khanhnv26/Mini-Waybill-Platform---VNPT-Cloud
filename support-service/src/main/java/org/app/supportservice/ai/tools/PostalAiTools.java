package org.app.supportservice.ai.tools;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.app.supportservice.ai.lookup.TariffLookupService;
import org.app.supportservice.ai.lookup.WaybillLookupService;
import org.app.supportservice.entity.SupportTicket;
import org.app.supportservice.repository.SupportTicketRepository;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Component;

import java.util.Locale;
import java.util.Optional;

@Slf4j
@Component
@RequiredArgsConstructor
public class PostalAiTools {

    private final SupportTicketRepository supportTicketRepository;
    private final WaybillLookupService waybillLookupService;
    private final TariffLookupService tariffLookupService;

    @Tool(description = "Tra cứu tình trạng khiếu nại theo mã phiếu thật, dạng TKT-YYYYMMDD-XXXX (ví dụ TKT-20260923-1234)")
    public String lookUpTicketStatus(@ToolParam(description = "Mã phiếu TKT-YYYYMMDD-XXXX") String ticketCode) {
        log.info("[AI Tool] Đang tra cứu ticket: {}", ticketCode);

        if (ticketCode == null || ticketCode.isBlank()) {
            return "Mã phiếu không được để trống. Vui lòng cung cấp mã phiếu hợp lệ dạng TKT-YYYYMMDD-XXXX.";
        }

        String code = ticketCode.trim().toUpperCase(Locale.ROOT);
        Optional<SupportTicket> ticketOpt = supportTicketRepository.findByTicketCode(code);

        if (ticketOpt.isEmpty()) {
            return "Không tìm thấy phiếu với mã: " + code + ". Vui lòng kiểm tra lại mã phiếu.";
        }

        SupportTicket ticket = ticketOpt.get();
        return String.format(
                "Thông tin khiếu nại [%s]:\n- Tiêu đề: %s\n- Phân loại: %s\n- Trạng thái hiện tại: %s\n- Mức độ ưu tiên: %s\n- Ngày tiếp nhận: %s\n- Nội dung: %s",
                ticket.getTicketCode(), ticket.getTitle(), ticket.getCategory(), ticket.getStatus(), ticket.getPriority(), ticket.getCreatedAt(), ticket.getDescription()
        );
    }

    @Tool(description = "Tra cứu trạng thái vận đơn thật theo mã vận đơn. Chỉ trả dữ liệu hệ thống, không có bưu tá giả lập.")
    public String trackShipment(@ToolParam(description = "Mã vận đơn cần tra cứu") String trackingCode) {
        log.info("[AI Tool] Đang tra cứu vận đơn: {}", trackingCode);
        return waybillLookupService.describe(trackingCode);
    }

    @Tool(description = "Tính cước chính thức theo bảng giá hệ thống. Bắt buộc có khối lượng kg, tỉnh gửi và tỉnh nhận. serviceType để trống để báo cả 3 gói, hoặc ECO, STANDARD, EXPRESS.")
    public String calculateShippingTariff(
            @ToolParam(description = "Khối lượng kiện hàng tính bằng kilogram (kg)") double weightKg,
            @ToolParam(description = "Tỉnh hoặc thành phố người gửi") String senderProvince,
            @ToolParam(description = "Tỉnh hoặc thành phố người nhận") String receiverProvince,
            @ToolParam(description = "Gói dịch vụ: ECO, STANDARD, EXPRESS, hoặc để trống") String serviceType) {
        log.info("[AI Tool] Tính cước: weight={}, from={}, to={}, service={}", weightKg, senderProvince, receiverProvince, serviceType);
        return tariffLookupService.quote(weightKg, senderProvince, receiverProvince, serviceType);
    }
}
