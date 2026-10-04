package org.app.notificationservice.bot;

import org.telegram.telegrambots.meta.api.objects.replykeyboard.InlineKeyboardMarkup;
import org.telegram.telegrambots.meta.api.objects.replykeyboard.buttons.InlineKeyboardButton;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

public final class ShipperBotKeyboards {

    private ShipperBotKeyboards() {
    }

    public static InlineKeyboardButton cb(String text, String callbackData) {
        return InlineKeyboardButton.builder().text(text).callbackData(callbackData).build();
    }

    public static InlineKeyboardMarkup markup(List<List<InlineKeyboardButton>> rows) {
        return InlineKeyboardMarkup.builder().keyboard(rows).build();
    }

    public static List<InlineKeyboardButton> row(InlineKeyboardButton... buttons) {
        return new ArrayList<>(Arrays.asList(buttons));
    }
}