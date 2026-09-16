package org.app.notificationservice.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.app.notificationservice.bot.TelegramBot;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.telegram.telegrambots.meta.TelegramBotsApi;
import org.telegram.telegrambots.meta.exceptions.TelegramApiException;
import org.telegram.telegrambots.updatesreceivers.DefaultBotSession;

@Slf4j
@Component
@RequiredArgsConstructor
public class TelegramBotRegistrar {

    private final TelegramBot telegramBot;

    @Value("${telegram.bot.enabled:false}")
    private boolean enabled;

    @Value("${telegram.bot.token:placeholder_token}")
    private String botToken;

    @EventListener(ApplicationReadyEvent.class)
    public void register() {
        if (!enabled || isPlaceholder(botToken)) {
            log.info("[TELEGRAM] Long-polling bot chưa kích hoạt (enabled={}, token placeholder={}). Bỏ qua đăng ký.",
                    enabled, isPlaceholder(botToken));
            return;
        }
        try {
            TelegramBotsApi botsApi = new TelegramBotsApi(DefaultBotSession.class);
            botsApi.registerBot(telegramBot);
            log.info("[TELEGRAM] Đã đăng ký bot long-polling thành công.");
        } catch (TelegramApiException e) {
            log.error("[TELEGRAM] Đăng ký bot long-polling thất bại: {}", e.getMessage(), e);
        }
    }

    private boolean isPlaceholder(String token) {
        return token == null || token.isBlank() || "placeholder_token".equalsIgnoreCase(token);
    }
}
