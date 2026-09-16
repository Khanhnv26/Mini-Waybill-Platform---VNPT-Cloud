package org.app.notificationservice.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.app.notificationservice.bot.TelegramBot;
import org.app.notificationservice.service.TelegramService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.telegram.telegrambots.meta.api.methods.send.SendMessage;

@Service
@RequiredArgsConstructor
@Slf4j
public class TelegramServiceImpl implements TelegramService {
    private final TelegramBot telegramBot;

    @Value("${telegram.bot.token:placeholder_token}")
    private String botToken;

    @Override
    public void sendMessage(String chatId, String message) {

        if(chatId == null || chatId.isEmpty()) {
            log.warn("[TELEGRAM] ChatId trống, bỏ qua gửi tin nhắn");
            return;
        }

        if ("placeholder_token".equalsIgnoreCase(botToken) || botToken.isBlank()) {
            log.warn("[TELEGRAM] Chưa cấu hình TELEGRAM_BOT_TOKEN thật. Giả lập gửi thông báo tới chatId {}:\n{}", chatId, message);
            return;
        }

        SendMessage sendMessage = SendMessage.builder()
                .chatId(chatId)
                .text(message)
                .parseMode("HTML")
                .build();

        try {
            telegramBot.execute(sendMessage);
            log.info("[TELEGRAM] Gửi tin nhắn tới chatId {} thành công", chatId);
        } catch (Exception e) {
            log.error("[TELEGRAM] Gửi tin nhắn tới chatId {} thất bại: {}", chatId, e.getMessage(), e);
        }

    }
}
