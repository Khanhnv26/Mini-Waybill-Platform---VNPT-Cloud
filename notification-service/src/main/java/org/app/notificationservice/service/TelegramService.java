package org.app.notificationservice.service;


public interface TelegramService {
    void sendMessage(String chatId, String message);
}
