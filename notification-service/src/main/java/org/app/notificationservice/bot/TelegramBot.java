package org.app.notificationservice.bot;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.app.notificationservice.client.ShipperClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.telegram.telegrambots.bots.TelegramLongPollingBot;
import org.telegram.telegrambots.meta.api.methods.ActionType;
import org.telegram.telegrambots.meta.api.methods.AnswerCallbackQuery;
import org.telegram.telegrambots.meta.api.methods.send.SendChatAction;
import org.telegram.telegrambots.meta.api.methods.send.SendMessage;
import org.telegram.telegrambots.meta.api.methods.send.SendPhoto;
import org.telegram.telegrambots.meta.api.methods.updatingmessages.EditMessageCaption;
import org.telegram.telegrambots.meta.api.methods.updatingmessages.EditMessageText;
import org.telegram.telegrambots.meta.api.objects.CallbackQuery;
import org.telegram.telegrambots.meta.api.objects.InputFile;
import org.telegram.telegrambots.meta.api.objects.Message;
import org.telegram.telegrambots.meta.api.objects.Update;
import org.telegram.telegrambots.meta.api.objects.replykeyboard.InlineKeyboardMarkup;

import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class TelegramBot extends TelegramLongPollingBot {

    private final ShipperClient shipperClient;
    private final ShipperBotHandler shipperBotHandler;

    @Value("${telegram.bot.username}")
    private String botUsername;

    @Value("${telegram.bot.token}")
    private String botToken;

    @Override
    public void onUpdateReceived(Update update) {
        if (update.hasCallbackQuery()) {
            handleCallbackQuery(update.getCallbackQuery());
            return;
        }

        if (update.getMessage() == null || !update.getMessage().hasText()) {
            return;
        }

        String text = update.getMessage().getText().trim();
        String chatId = update.getMessage().getChatId().toString();

        if (text.startsWith("/link") || text.startsWith("/start")) {
            handleLinkCommand(chatId, text);
            return;
        }

        shipperBotHandler.onMessage(this, chatId, text);
    }

    private void handleCallbackQuery(CallbackQuery callbackQuery) {
        String chatId = callbackQuery.getMessage() != null
                ? callbackQuery.getMessage().getChatId().toString()
                : String.valueOf(callbackQuery.getFrom().getId());
        Integer messageId = callbackQuery.getMessage() != null
                ? callbackQuery.getMessage().getMessageId()
                : null;

        try {
            answerCallback(callbackQuery.getId(), null, false);
        } catch (Exception e) {
            log.warn("[TELEGRAM BOT] Không trả lời được callback {}: {}", callbackQuery.getId(), e.getMessage());
        }

        shipperBotHandler.onCallback(this, chatId, messageId, callbackQuery.getId(), callbackQuery.getData());
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
            sendHtml(chatId, "Vui lòng nhập kèm mã bưu tá.\nVí dụ: <code>/link NV_HN_01</code>", null);
            return;
        }

        String courierCode = parts[1].trim().toUpperCase();

        try {
            Map<String, Object> result = shipperClient.linkTelegram(Map.of("courierCode", courierCode, "telegramChatId", chatId));
            boolean success = Boolean.TRUE.equals(result.get("success"));
            if (success) {
                sendHtml(chatId, "<b>Liên kết thành công!</b>\n"
                        + "Tài khoản Telegram này đã được gắn với bưu tá: <b>" + courierCode + "</b>.\n"
                        + "Gõ /menu để mở bảng thao tác nhanh.", null);
                shipperBotHandler.onMessage(this, chatId, "/menu");
            } else {
                sendHtml(chatId, "Không tìm thấy mã bưu tá <b>" + courierCode + "</b> trên hệ thống. Vui lòng kiểm tra lại với quản trị viên!", null);
            }
        } catch (Exception e) {
            log.error("[TELEGRAM BOT] Lỗi gọi shipper-service liên kết chatId: {}", e.getMessage(), e);
            sendHtml(chatId, "Đã xảy ra lỗi khi liên kết tài khoản. Vui lòng thử lại sau.", null);
        }
    }

    public void sendHtml(String chatId, String message, InlineKeyboardMarkup keyboard) {
        try {
            SendMessage sendMessage = keyboard != null
                    ? SendMessage.builder().chatId(chatId).text(message).parseMode("HTML").replyMarkup(keyboard).build()
                    : SendMessage.builder().chatId(chatId).text(message).parseMode("HTML").build();
            execute(sendMessage);
        } catch (Exception e) {
            log.error("[TELEGRAM BOT] Lỗi gửi tin nhắn đến chatId {}: {}", chatId, e.getMessage());
        }
    }

    public void editHtml(String chatId, Integer messageId, String message, InlineKeyboardMarkup keyboard) {
        if (messageId == null) {
            sendHtml(chatId, message, keyboard);
            return;
        }
        try {
            EditMessageText editMessage = keyboard != null
                    ? EditMessageText.builder().chatId(chatId).messageId(messageId).text(message).parseMode("HTML").replyMarkup(keyboard).build()
                    : EditMessageText.builder().chatId(chatId).messageId(messageId).text(message).parseMode("HTML").build();
            execute(editMessage);
        } catch (Exception e) {
            if (e.getMessage() != null && e.getMessage().contains("message is not modified")) {
                return;
            }
            // Tin nhắn nguồn có thể là ảnh (QR) không sửa text được -> gửi tin mới
            sendHtml(chatId, message, keyboard);
        }
    }

    public void answerCallback(String callbackId, String text, boolean showAlert) {
        try {
            AnswerCallbackQuery query = (text != null && !text.isBlank())
                    ? AnswerCallbackQuery.builder().callbackQueryId(callbackId).text(text).showAlert(showAlert).build()
                    : AnswerCallbackQuery.builder().callbackQueryId(callbackId).showAlert(showAlert).build();
            execute(query);
        } catch (Exception e) {
            log.warn("[TELEGRAM BOT] Không gửi được answerCallbackQuery {}: {}", callbackId, e.getMessage());
        }
    }

    public void typing(String chatId) {
        chatAction(chatId, ActionType.TYPING);
    }

    public void uploadingPhoto(String chatId) {
        chatAction(chatId, ActionType.UPLOADPHOTO);
    }

    private void chatAction(String chatId, ActionType actionType) {
        try {
            execute(SendChatAction.builder().chatId(chatId).action(actionType.toString()).build());
        } catch (Exception e) {
            log.debug("[TELEGRAM BOT] Không gửi được chat action {}: {}", actionType, e.getMessage());
        }
    }

    public Integer sendPhoto(String chatId, String photoUrl, String caption, InlineKeyboardMarkup keyboard) {
        try {
            SendPhoto sendPhoto = keyboard != null
                    ? SendPhoto.builder().chatId(chatId).photo(new InputFile(photoUrl)).caption(caption)
                            .parseMode("HTML").replyMarkup(keyboard).build()
                    : SendPhoto.builder().chatId(chatId).photo(new InputFile(photoUrl)).caption(caption)
                            .parseMode("HTML").build();
            Message sent = execute(sendPhoto);
            return sent != null ? sent.getMessageId() : null;
        } catch (Exception e) {
            log.warn("[TELEGRAM BOT] Không gửi được ảnh QR tới chatId {}: {}", chatId, e.getMessage());
            return null;
        }
    }

    public void editCaption(String chatId, Integer messageId, String caption, InlineKeyboardMarkup keyboard) {
        if (messageId == null) {
            sendHtml(chatId, caption, keyboard);
            return;
        }
        try {
            EditMessageCaption edit = keyboard != null
                    ? EditMessageCaption.builder().chatId(chatId).messageId(messageId).caption(caption)
                            .parseMode("HTML").replyMarkup(keyboard).build()
                    : EditMessageCaption.builder().chatId(chatId).messageId(messageId).caption(caption)
                            .parseMode("HTML").build();
            execute(edit);
        } catch (Exception e) {
            if (e.getMessage() != null && e.getMessage().contains("message is not modified")) {
                return;
            }
            sendHtml(chatId, caption, keyboard);
        }
    }
}