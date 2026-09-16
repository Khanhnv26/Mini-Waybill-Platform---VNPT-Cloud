package org.app.notificationservice.bot;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.app.notificationservice.client.ShipperClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.telegram.telegrambots.bots.TelegramLongPollingBot;
import org.telegram.telegrambots.meta.api.methods.send.SendMessage;
import org.telegram.telegrambots.meta.api.objects.Update;

import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class TelegramBot extends TelegramLongPollingBot {

    private final ShipperClient shipperClient;

    @Value("${telegram.bot.username}")
    private String botUsername;

    @Value("${telegram.bot.token}")
    private String botToken;


    @Override
    public void onUpdateReceived(Update update) {
        if(update.getMessage() == null || !update.getMessage().hasText()) {
            return;
        }

        String text = update.getMessage().getText().trim();
        String chatId = update.getMessage().getChatId().toString();

        if(text.startsWith("/link") || text.startsWith("/start")) {
            handleLinkCommand(chatId, text);
        } else {
            sendReply(chatId, "Xin chào! Tôi là bot thông báo của hệ thống.\n"
                    + "Để liên kết tài khoản Telegram với bưu tá, vui lòng sử dụng lệnh:\n"
                    + "`/link <MÃ_BUU_TA>`\n"
                    + "Ví dụ: `/link NV_HN_01`");
        }

    }

    @Override
    public String getBotUsername() {
        return this.botUsername;
    }

    @Override
    public String getBotToken() {
        return this.botToken;
    }

    private void handleLinkCommand(String chatId, String text) {
        String[] parts = text.split("\\s+");
        if (parts.length < 2) {
            sendReply(chatId, "Vui lòng nhập kèm mã bưu tá.\nVí dụ: `/link NV_HN_01`");
            return;
        }

        String courierCode = parts[1].trim().toUpperCase();

        try {
            Map<String, Object> result = shipperClient.linkTelegram(Map.of("courierCode", courierCode, "telegramChatId", chatId));
            boolean success = Boolean.TRUE.equals(result.get("success"));
            if(success) {
                sendReply(chatId, "*Liên kết thành công!*\n"
                        + "Tài khoản Telegram này đã được gắn với bưu tá: *" + courierCode + "*.\n"
                        + "Bạn sẽ nhận được thông báo ngay khi có đơn hàng mới được bàn giao.");
            } else {
                sendReply(chatId, "Không tìm thấy mã bưu tá *" + courierCode + "* trên hệ thống. Vui lòng kiểm tra lại với quản trị viên!");
            }
        } catch (Exception e) {
            log.error("[TELEGRAM BOT] Lỗi gọi shipper-service liên kết chatId: {}", e.getMessage(), e);
            sendReply(chatId, "Đã xảy ra lỗi khi liên kết tài khoản. Vui lòng thử lại sau.");
        }
    }

    public void sendReply(String chatId, String message) {
        SendMessage sendMessage = SendMessage.builder()
                .chatId(chatId)
                .text(message)
                .parseMode("Markdown")
                .build();
        try {
            execute(sendMessage);
        } catch (Exception e) {
            log.error("[TELEGRAM BOT] Lỗi gửi tin nhắn đến chatId {}: {}", chatId, e.getMessage(), e);
        }
    }
}
