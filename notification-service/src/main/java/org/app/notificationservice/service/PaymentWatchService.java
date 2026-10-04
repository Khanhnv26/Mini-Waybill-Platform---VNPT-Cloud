package org.app.notificationservice.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.app.notificationservice.bot.TelegramBot;
import org.app.notificationservice.client.PaymentClient;
import org.app.notificationservice.dto.response.PaymentResponse;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentWatchService {

    private static final Set<String> FAILED_STATUSES = Set.of("CANCELLED", "FAILED", "EXPIRED");

    private final ShipperOrderIndexService shipperOrderIndexService;
    private final PaymentClient paymentClient;
    private final ShipperBotService shipperBotService;
    private final TelegramBot telegramBot;

    @Scheduled(fixedDelayString = "${telegram.bot.payment-watch-interval-ms:4000}")
    public void pollPendingPayments() {
        for (String trackingCode : shipperOrderIndexService.getPaymentWatchCodes()) {
            try {
                checkPayment(trackingCode);
            } catch (Exception e) {
                log.warn("[PAY-WATCH] Lỗi kiểm tra thanh toán đơn {}: {}", trackingCode, e.getMessage());
            }
        }
    }

    private void checkPayment(String trackingCode) {
        Map<String, String> watch = shipperOrderIndexService.getPaymentWatch(trackingCode);
        if (watch == null || watch.isEmpty()) {
            shipperOrderIndexService.clearPaymentWatch(trackingCode);
            return;
        }

        PaymentResponse payment = paymentClient.getByTracking(trackingCode);
        if (payment == null || payment.getStatus() == null) {
            return;
        }

        String status = payment.getStatus().trim().toUpperCase();
        String chatId = watch.get("chatId");
        String courierCode = watch.get("courierCode");
        String type = watch.get("type");
        Integer messageId = parseMessageId(watch.get("messageId"));

        if ("SUCCESS".equals(status)) {
            if ("RETURN_FEE".equalsIgnoreCase(type)) {
                try {
                    shipperBotService.confirmReturned(courierCode, trackingCode, true);
                    shipperOrderIndexService.removeOrder(courierCode, trackingCode);
                    sendAndEdit(chatId, messageId,
                            "🎉 <b>Đã nhận cước hoàn!</b>\nĐơn <code>" + escape(trackingCode)
                                    + "</code> đã được xác nhận hoàn về người gửi.");
                } catch (Exception e) {
                    log.error("[PAY-WATCH] Đã nhận tiền nhưng không xác nhận hoàn được đơn {}: {}",
                            trackingCode, e.getMessage());
                    telegramBot.sendHtml(chatId, "⚠️ Đã nhận cước hoàn nhưng chưa cập nhật được trạng thái đơn "
                            + escape(trackingCode) + ". Vui lòng thử xác nhận lại.", null);
                }
            } else {
                shipperOrderIndexService.removeOrder(courierCode, trackingCode);
                shipperOrderIndexService.markDeliveredToday(courierCode, trackingCode);
                shipperOrderIndexService.applySettlementStatus(trackingCode, "SETTLED");
                sendAndEdit(chatId, messageId,
                        "🎉 <b>Khách đã thanh toán COD!</b>\nĐơn <code>" + escape(trackingCode)
                                + "</code> tự động chuyển giao thành công và vào quỹ đã thu.");
            }
            shipperOrderIndexService.clearPaymentWatch(trackingCode);
            return;
        }

        if (FAILED_STATUSES.contains(status)) {
            sendAndEdit(chatId, messageId,
                    "⚠️ Giao dịch đơn <code>" + escape(trackingCode) + "</code> đã " + status
                            + ". Vui lòng tạo lại mã QR hoặc thu tiền mặt.");
            shipperOrderIndexService.clearPaymentWatch(trackingCode);
        }
    }

    private void sendAndEdit(String chatId, Integer messageId, String text) {
        if (chatId == null || chatId.isBlank()) {
            return;
        }
        if (messageId != null) {
            telegramBot.editCaption(chatId, messageId, text, null);
        } else {
            telegramBot.sendHtml(chatId, text, null);
        }
    }

    private Integer parseMessageId(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return Integer.parseInt(value.trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private String escape(String value) {
        if (value == null) {
            return "";
        }
        return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }
}