package org.app.notificationservice.bot;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.app.notificationservice.dto.response.ShipmentDetailResponse;
import org.app.notificationservice.dto.response.ShipperForecastResponse;
import org.app.notificationservice.dto.response.ShipperLookupResponse;
import org.app.notificationservice.service.ShipperBotService;
import org.telegram.telegrambots.meta.api.objects.replykeyboard.InlineKeyboardMarkup;
import org.telegram.telegrambots.meta.api.objects.replykeyboard.buttons.InlineKeyboardButton;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

import static org.app.notificationservice.bot.ShipperBotKeyboards.cb;
import static org.app.notificationservice.bot.ShipperBotKeyboards.markup;
import static org.app.notificationservice.bot.ShipperBotKeyboards.row;
import static org.app.notificationservice.bot.ShipperBotKeyboards.url;

@Component
@RequiredArgsConstructor
@Slf4j
public class ShipperBotHandler {

    private static final int PAGE_SIZE = 5;

    private static final Map<String, String> FAILURE_REASON_LABELS = new LinkedHashMap<>();

    static {
        FAILURE_REASON_LABELS.put("KHONG_NGHE_MAY", "Khách không nghe máy");
        FAILURE_REASON_LABELS.put("SAI_DIA_CHI", "Sai địa chỉ");
        FAILURE_REASON_LABELS.put("HEN_LAI_NGAY", "Khách hẹn lại ngày");
        FAILURE_REASON_LABELS.put("TU_CHOI_NHAN", "Khách từ chối nhận");
    }

    private final ShipperBotService shipperBotService;
    private final Map<String, Set<String>> codSelection = new ConcurrentHashMap<>();

    public void onMessage(TelegramBot bot, String chatId, String text) {
        String command = text == null ? "" : text.trim().toLowerCase();
        if (command.startsWith("/menu") || command.startsWith("/start") || command.startsWith("/donhang")) {
            showMainMenu(bot, chatId, null);
            return;
        }
        if (command.startsWith("/help")) {
            bot.sendHtml(chatId, "Gõ /menu để mở bảng thao tác nhanh.\n"
                    + "Nếu chưa liên kết, gõ /link <MÃ_BƯU_TÁ>.", null);
            return;
        }
        showMainMenu(bot, chatId, null);
    }

    public void onCallback(TelegramBot bot, String chatId, Integer messageId, String callbackId, String data) {
        try {
            route(bot, chatId, messageId, data);
        } catch (Exception e) {
            log.error("[SHIPPER-BOT] Lỗi xử lý callback {}: {}", data, e.getMessage(), e);
            bot.answerCallback(callbackId, "Có lỗi xảy ra, vui lòng thử lại.", true);
        }
    }

    private void route(TelegramBot bot, String chatId, Integer messageId, String data) {
        if (data == null || data.isBlank()) {
            return;
        }
        String[] parts = data.split(":");
        String action = parts[0];

        ShipperLookupResponse shipper = shipperBotService.resolveShipper(chatId);
        if (shipper == null || !shipper.isFound()) {
            bot.editHtml(chatId, messageId,
                    "Tài khoản Telegram này chưa liên kết bưu tá.\nGõ <code>/link MÃ_BƯU_TÁ</code> để liên kết.",
                    null);
            return;
        }

        switch (action) {
            case "m" -> showMainMenu(bot, chatId, messageId);
            case "o" -> showOrders(bot, chatId, messageId, shipper, pageArg(parts));
            case "d" -> showOrderDetail(bot, chatId, messageId, shipper, arg(parts, 1));
            case "dl" -> showDeliverConfirm(bot, chatId, messageId, arg(parts, 1));
            case "dlc" -> doDeliver(bot, chatId, messageId, shipper, arg(parts, 1));
            case "fl" -> showFailureReasons(bot, chatId, messageId, arg(parts, 1));
            case "flc" -> doFail(bot, chatId, messageId, shipper, arg(parts, 1), arg(parts, 2));
            case "c" -> showCod(bot, chatId, messageId, shipper);
            case "ct" -> toggleCod(bot, chatId, messageId, shipper, arg(parts, 1));
            case "cx" -> toggleAllCod(bot, chatId, messageId, shipper);
            case "cok" -> submitCod(bot, chatId, messageId, shipper);
            case "s" -> showShift(bot, chatId, messageId, shipper);
            case "st" -> doToggleShift(bot, chatId, messageId, shipper);
            case "f" -> showForecast(bot, chatId, messageId, shipper);
            default -> showMainMenu(bot, chatId, messageId);
        }
    }

    // ------------------------------------------------------------------ screens

    private void showMainMenu(TelegramBot bot, String chatId, Integer messageId) {
        ShipperLookupResponse shipper = shipperBotService.resolveShipper(chatId);
        if (shipper == null || !shipper.isFound()) {
            String text = "Chào bạn! Tài khoản Telegram này chưa liên kết bưu tá.\n"
                    + "Gõ <code>/link MÃ_BƯU_TÁ</code> để liên kết.";
            if (messageId != null) {
                bot.editHtml(chatId, messageId, text, null);
            } else {
                bot.sendHtml(chatId, text, null);
            }
            return;
        }

        int activeOrders = shipperBotService.getActiveOrders(shipper.getCourierCode()).size();
        int pendingCod = shipperBotService.getPendingCodOrders(shipper.getCourierCode()).size();

        String text = "<b>Xin chào " + esc(shipper.getFullName()) + "!</b>\n"
                + "Bưu cục: " + esc(safe(shipper.getStationCode())) + "\n"
                + "Ca trực: " + shiftLabel(shipper.getShiftStatus()) + "\n"
                + "Đang giữ: " + activeOrders + " đơn · Chờ nộp quỹ: " + pendingCod + " đơn";

        InlineKeyboardMarkup keyboard = markup(List.of(
                row(cb("Đơn cần giao (" + activeOrders + ")", "o:0")),
                row(cb("Nộp quỹ COD (" + pendingCod + ")", "c")),
                row(cb("Đổi ca trực", "s"), cb("Dự báo ca mai", "f"))
        ));

        if (messageId != null) {
            bot.editHtml(chatId, messageId, text, keyboard);
        } else {
            bot.sendHtml(chatId, text, keyboard);
        }
    }

    private void showOrders(TelegramBot bot, String chatId, Integer messageId,
                            ShipperLookupResponse shipper, int page) {
        List<ShipmentDetailResponse> orders = shipperBotService.getActiveOrders(shipper.getCourierCode());
        if (orders.isEmpty()) {
            bot.editHtml(chatId, messageId, "<b>Đơn cần giao</b>\nHiện không có đơn nào cần phát.",
                    markup(List.of(row(cb("Menu chính", "m")))));
            return;
        }

        int pages = (int) Math.ceil(orders.size() / (double) PAGE_SIZE);
        int currentPage = Math.max(0, Math.min(page, pages - 1));
        int from = currentPage * PAGE_SIZE;
        int to = Math.min(from + PAGE_SIZE, orders.size());

        StringBuilder text = new StringBuilder("<b>Đơn cần giao</b> · Trang ")
                .append(currentPage + 1).append("/").append(pages);

        List<List<InlineKeyboardButton>> rows = new ArrayList<>();
        for (int i = from; i < to; i++) {
            ShipmentDetailResponse order = orders.get(i);
            String label = order.getTrackingCode()
                    + (order.getReceiverName() != null ? " · " + shortText(order.getReceiverName(), 18) : "");
            rows.add(row(cb(label, "d:" + order.getTrackingCode())));
        }

        List<InlineKeyboardButton> nav = new ArrayList<>();
        if (currentPage > 0) {
            nav.add(cb("‹ Trước", "o:" + (currentPage - 1)));
        }
        if (currentPage < pages - 1) {
            nav.add(cb("Sau ›", "o:" + (currentPage + 1)));
        }
        if (!nav.isEmpty()) {
            rows.add(nav);
        }
        rows.add(row(cb("Menu chính", "m")));

        bot.editHtml(chatId, messageId, text.toString(), markup(rows));
    }

    private void showOrderDetail(TelegramBot bot, String chatId, Integer messageId,
                                 ShipperLookupResponse shipper, String trackingCode) {
        if (trackingCode == null || trackingCode.isBlank()) {
            return;
        }
        ShipmentDetailResponse order = shipperBotService.getOrder(trackingCode);
        if (order == null) {
            bot.editHtml(chatId, messageId, "Không tìm thấy đơn " + esc(trackingCode),
                    markup(List.of(row(cb("Danh sách", "o:0"), cb("Menu", "m")))));
            return;
        }

        String status = safe(order.getCurrentStatus());
        StringBuilder text = new StringBuilder()
                .append("<b>").append(esc(order.getTrackingCode())).append("</b>\n")
                .append("Người nhận: ").append(esc(safe(order.getReceiverName()))).append("\n")
                .append("SĐT: ").append(esc(safe(order.getReceiverPhone()))).append("\n")
                .append("Địa chỉ: ").append(esc(safe(order.getReceiverAddress()))).append("\n")
                .append("COD: ").append(formatMoney(order.getCodAmount())).append("\n")
                .append("Dịch vụ: ").append(esc(safe(order.getServiceType()))).append("\n")
                .append("Trạng thái: ").append(esc(status));

        List<List<InlineKeyboardButton>> rows = new ArrayList<>();
        if ("OUT_FOR_DELIVERY".equalsIgnoreCase(status) || "DELIVERY_FAILED".equalsIgnoreCase(status)) {
            rows.add(row(cb("Giao OK", "dl:" + trackingCode), cb("Thất bại", "fl:" + trackingCode)));
        }
        if (order.getReceiverPhone() != null && !order.getReceiverPhone().isBlank()) {
            rows.add(row(url("Gọi khách", "tel:" + order.getReceiverPhone().replaceAll("[^+0-9]", ""))));
        }
        rows.add(row(cb("Danh sách", "o:0"), cb("Menu", "m")));

        bot.editHtml(chatId, messageId, text.toString(), markup(rows));
    }

    private void showDeliverConfirm(TelegramBot bot, String chatId, Integer messageId, String trackingCode) {
        ShipmentDetailResponse order = shipperBotService.getOrder(trackingCode);
        if (order == null) {
            return;
        }
        String text = "<b>Xác nhận giao thành công</b>\n"
                + esc(order.getTrackingCode()) + "\n"
                + "Người nhận: " + esc(safe(order.getReceiverName())) + "\n"
                + "Thu COD: " + formatMoney(order.getCodAmount());
        bot.editHtml(chatId, messageId, text,
                markup(List.of(
                        row(cb("Xác nhận", "dlc:" + trackingCode), cb("Huỷ", "d:" + trackingCode)),
                        row(cb("Menu", "m"))
                )));
    }

    private void doDeliver(TelegramBot bot, String chatId, Integer messageId,
                           ShipperLookupResponse shipper, String trackingCode) {
        if (!shipperBotService.isOrderOwnedBy(shipper.getCourierCode(), trackingCode)) {
            bot.editHtml(chatId, messageId, "Đơn này không thuộc quyền phát của bạn.",
                    markup(List.of(row(cb("Danh sách", "o:0"), cb("Menu", "m")))));
            return;
        }
        ShipmentDetailResponse updated = shipperBotService.markDelivered(shipper.getCourierCode(), trackingCode);
        String status = updated != null ? safe(updated.getCurrentStatus()) : "DELIVERED";
        BigDecimal cod = updated != null ? updated.getCodAmount() : null;
        boolean hasCod = cod != null && cod.compareTo(BigDecimal.ZERO) > 0;

        String text = "<b>Đã cập nhật!</b>\n"
                + esc(trackingCode) + " → " + esc(status) + "\n"
                + (hasCod ? formatMoney(cod) + " đã vào danh sách chờ nộp quỹ." : "Không có tiền COD.");

        List<List<InlineKeyboardButton>> rows = new ArrayList<>();
        if (hasCod) {
            rows.add(row(cb("Nộp quỹ ngay", "c")));
        }
        rows.add(row(cb("Danh sách đơn", "o:0"), cb("Menu", "m")));
        bot.editHtml(chatId, messageId, text, markup(rows));
    }

    private void showFailureReasons(TelegramBot bot, String chatId, Integer messageId, String trackingCode) {
        String text = "<b>Lý do giao thất bại</b>\n" + esc(safe(trackingCode));
        List<List<InlineKeyboardButton>> rows = new ArrayList<>();
        for (Map.Entry<String, String> entry : FAILURE_REASON_LABELS.entrySet()) {
            rows.add(row(cb(entry.getValue(), "flc:" + trackingCode + ":" + entry.getKey())));
        }
        rows.add(row(cb("Quay lại", "d:" + trackingCode)));
        bot.editHtml(chatId, messageId, text, markup(rows));
    }

    private void doFail(TelegramBot bot, String chatId, Integer messageId,
                        ShipperLookupResponse shipper, String trackingCode, String reasonCode) {
        if (!shipperBotService.isOrderOwnedBy(shipper.getCourierCode(), trackingCode)) {
            bot.editHtml(chatId, messageId, "Đơn này không thuộc quyền phát của bạn.",
                    markup(List.of(row(cb("Danh sách", "o:0"), cb("Menu", "m")))));
            return;
        }
        ShipmentDetailResponse updated = shipperBotService.markDeliveryFailed(
                shipper.getCourierCode(), trackingCode, reasonCode);
        String status = updated != null ? safe(updated.getCurrentStatus()) : "DELIVERY_FAILED";
        String reasonLabel = FAILURE_REASON_LABELS.getOrDefault(reasonCode, "Giao thất bại");

        String text = "<b>Đã ghi nhận giao thất bại</b>\n"
                + esc(trackingCode) + "\n"
                + "Lý do: " + esc(reasonLabel) + "\n"
                + "Trạng thái hiện tại: " + esc(status);
        if ("RETURNING".equalsIgnoreCase(status)) {
            text += "\n\nĐơn đã thất bại 3 lần và tự động chuyển hoàn về người gửi.";
        }
        bot.editHtml(chatId, messageId, text,
                markup(List.of(row(cb("Danh sách đơn", "o:0"), cb("Menu", "m")))));
    }

    private void showCod(TelegramBot bot, String chatId, Integer messageId, ShipperLookupResponse shipper) {
        List<ShipmentDetailResponse> pending = shipperBotService.getPendingCodOrders(shipper.getCourierCode());
        Set<String> selected = codSelection.computeIfAbsent(chatId, k -> new LinkedHashSet<>());
        selected.removeIf(code -> pending.stream().noneMatch(p -> p.getTrackingCode().equals(code)));

        if (pending.isEmpty()) {
            codSelection.remove(chatId);
            bot.editHtml(chatId, messageId, "<b>Nộp quỹ COD</b>\nKhông có đơn nào chờ nộp quỹ.",
                    markup(List.of(row(cb("Menu chính", "m")))));
            return;
        }

        BigDecimal selectedTotal = pending.stream()
                .filter(p -> selected.contains(p.getTrackingCode()))
                .map(p -> p.getCodAmount() != null ? p.getCodAmount() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        String text = "<b>Nộp quỹ COD</b>\n"
                + esc(safe(shipper.getFullName())) + " · " + esc(safe(shipper.getStationCode())) + "\n"
                + "Đã chọn: " + selected.size() + "/" + pending.size() + " đơn\n"
                + "Tổng: " + formatMoney(selectedTotal);

        List<List<InlineKeyboardButton>> rows = new ArrayList<>();
        for (ShipmentDetailResponse order : pending) {
            boolean checked = selected.contains(order.getTrackingCode());
            String label = (checked ? "☑ " : "☐ ") + order.getTrackingCode() + " · " + formatMoney(order.getCodAmount());
            rows.add(row(cb(label, "ct:" + order.getTrackingCode())));
        }
        boolean allSelected = selected.size() == pending.size();
        rows.add(row(cb(allSelected ? "Bỏ chọn tất cả" : "Chọn tất cả", "cx")));
        if (!selected.isEmpty()) {
            rows.add(row(cb("Xác nhận nộp (" + formatMoney(selectedTotal) + ")", "cok")));
        }
        rows.add(row(cb("Menu chính", "m")));

        bot.editHtml(chatId, messageId, text, markup(rows));
    }

    private void toggleCod(TelegramBot bot, String chatId, Integer messageId,
                           ShipperLookupResponse shipper, String trackingCode) {
        if (trackingCode == null || trackingCode.isBlank()) {
            return;
        }
        Set<String> selected = codSelection.computeIfAbsent(chatId, k -> new LinkedHashSet<>());
        if (!selected.remove(trackingCode)) {
            selected.add(trackingCode);
        }
        showCod(bot, chatId, messageId, shipper);
    }

    private void toggleAllCod(TelegramBot bot, String chatId, Integer messageId, ShipperLookupResponse shipper) {
        List<ShipmentDetailResponse> pending = shipperBotService.getPendingCodOrders(shipper.getCourierCode());
        Set<String> selected = codSelection.computeIfAbsent(chatId, k -> new LinkedHashSet<>());
        if (selected.size() == pending.size()) {
            selected.clear();
        } else {
            selected.clear();
            pending.forEach(p -> selected.add(p.getTrackingCode()));
        }
        showCod(bot, chatId, messageId, shipper);
    }

    private void submitCod(TelegramBot bot, String chatId, Integer messageId, ShipperLookupResponse shipper) {
        Set<String> selected = codSelection.getOrDefault(chatId, Set.of());
        if (selected.isEmpty()) {
            bot.editHtml(chatId, messageId, "Bạn chưa chọn đơn nào để nộp quỹ.",
                    markup(List.of(row(cb("Quay lại", "c"), cb("Menu", "m")))));
            return;
        }
        int count = shipperBotService.submitCod(shipper.getCourierCode(), new ArrayList<>(selected));
        codSelection.remove(chatId);
        bot.editHtml(chatId, messageId,
                "<b>Đã gửi yêu cầu nộp quỹ</b>\n" + count + " đơn đã chuyển sang trạng thái chờ thủ quỹ duyệt.",
                markup(List.of(row(cb("Menu chính", "m")))));
    }

    private void showShift(TelegramBot bot, String chatId, Integer messageId, ShipperLookupResponse shipper) {
        boolean onDuty = !"OFF_DUTY".equalsIgnoreCase(safe(shipper.getShiftStatus()));
        String text = "<b>Ca trực</b>\nHiện tại: " + shiftLabel(shipper.getShiftStatus());
        String button = onDuty ? "Tan ca (OFF_DUTY)" : "Vào ca (ON_DUTY)";
        bot.editHtml(chatId, messageId, text,
                markup(List.of(row(cb(button, "st")), row(cb("Menu chính", "m")))));
    }

    private void doToggleShift(TelegramBot bot, String chatId, Integer messageId, ShipperLookupResponse shipper) {
        ShipperLookupResponse updated = shipperBotService.toggleShift(shipper.getCourierCode());
        String text = "<b>Ca trực</b>\nĐã cập nhật: " + shiftLabel(updated != null ? updated.getShiftStatus() : null);
        bot.editHtml(chatId, messageId, text,
                markup(List.of(row(cb("Menu chính", "m")))));
    }

    private String shiftLabel(String shiftStatus) {
        return "OFF_DUTY".equalsIgnoreCase(safe(shiftStatus)) ? "Đã tan ca" : "Đang trực";
    }

    private void showForecast(TelegramBot bot, String chatId, Integer messageId, ShipperLookupResponse shipper) {
        ShipperForecastResponse forecast = shipperBotService.getForecast(shipper.getCourierCode());
        if (forecast == null) {
            bot.editHtml(chatId, messageId, "Chưa có số liệu dự báo cho ca tới.",
                    markup(List.of(row(cb("Menu chính", "m")))));
            return;
        }
        String text = "<b>Dự báo ca mai</b>\n"
                + "Bưu tá: " + esc(safe(forecast.getFullName())) + "\n"
                + "Khu vực: " + esc(safe(forecast.getAssignedZone())) + "\n"
                + "Đơn dự kiến: " + forecast.getEstimatedOrdersCount() + "\n"
                + "Công suất ca: " + String.format("%.0f", forecast.getUtilizationRate()) + "%\n"
                + "COD dự kiến: " + formatMoney(forecast.getEstimatedCodAmount());
        bot.editHtml(chatId, messageId, text, markup(List.of(row(cb("Menu chính", "m")))));
    }

    // ------------------------------------------------------------------ helpers

    private int pageArg(String[] parts) {
        if (parts.length < 2) {
            return 0;
        }
        try {
            return Integer.parseInt(parts[1]);
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    private String arg(String[] parts, int index) {
        return parts.length > index ? parts[index] : null;
    }

    private String formatMoney(BigDecimal amount) {
        if (amount == null) {
            return "0đ";
        }
        return String.format("%,.0fđ", amount.doubleValue());
    }

    private String shortText(String value, int max) {
        if (value == null) {
            return "";
        }
        String trimmed = value.trim();
        return trimmed.length() <= max ? trimmed : trimmed.substring(0, max - 1) + "…";
    }

    private String esc(String value) {
        if (value == null) {
            return "";
        }
        return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }

    private String safe(String value) {
        return value == null ? "" : value;
    }
}