package org.app.notificationservice.bot;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.app.notificationservice.dto.response.PaymentResponse;
import org.app.notificationservice.dto.response.ShipmentDetailResponse;
import org.app.notificationservice.dto.response.ShipperForecastResponse;
import org.app.notificationservice.dto.response.ShipperLookupResponse;
import org.app.notificationservice.service.ShipperBotService;
import org.app.notificationservice.service.ShipperOrderIndexService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.telegram.telegrambots.meta.api.objects.replykeyboard.InlineKeyboardMarkup;
import org.telegram.telegrambots.meta.api.objects.replykeyboard.buttons.InlineKeyboardButton;

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
    private final ShipperOrderIndexService shipperOrderIndexService;
    private final Map<String, Set<String>> codSelection = new ConcurrentHashMap<>();

    @Value("${telegram.bot.payment-mock-enabled:false}")
    private boolean paymentMockEnabled;

    public void onMessage(TelegramBot bot, String chatId, String text) {
        String command = text == null ? "" : text.trim().toLowerCase();
        if (command.startsWith("/help")) {
            bot.sendHtml(chatId, "Gõ /menu để mở bảng thao tác nhanh.\n"
                    + "Nếu chưa liên kết, gõ /link <MÃ_BƯU_TÁ>.", null);
            return;
        }
        showMainMenu(bot, chatId, null);
    }

    public void onCallback(TelegramBot bot, String chatId, Integer messageId, String callbackId, String data) {
        try {
            bot.typing(chatId);
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
            case "o" -> showOrders(bot, chatId, messageId, shipper, arg(parts, 1), pageArg(parts));
            case "d" -> showOrderDetail(bot, chatId, messageId, shipper, arg(parts, 1));
            case "dl" -> showDeliverChooser(bot, chatId, messageId, arg(parts, 1));
            case "dlc" -> doDeliver(bot, chatId, messageId, shipper, arg(parts, 1));
            case "dlq" -> createCodQr(bot, chatId, messageId, shipper, arg(parts, 1));
            case "fl" -> showFailureReasons(bot, chatId, messageId, arg(parts, 1));
            case "flc" -> doFail(bot, chatId, messageId, shipper, arg(parts, 1), arg(parts, 2));
            case "rt" -> doRetry(bot, chatId, messageId, shipper, arg(parts, 1));
            case "ar" -> doAcceptReturn(bot, chatId, messageId, shipper, arg(parts, 1));
            case "rr" -> showReturnChooser(bot, chatId, messageId, shipper, arg(parts, 1));
            case "rrc" -> doReturnCash(bot, chatId, messageId, shipper, arg(parts, 1));
            case "rrq" -> createReturnQr(bot, chatId, messageId, shipper, arg(parts, 1));
            case "chk" -> checkPayment(bot, chatId, messageId, arg(parts, 1));
            case "mock" -> mockPay(bot, chatId, messageId, arg(parts, 1));
            case "c" -> showCod(bot, chatId, messageId, shipper);
            case "ct" -> toggleCod(bot, chatId, messageId, shipper, arg(parts, 1));
            case "cx" -> toggleAllCod(bot, chatId, messageId, shipper);
            case "cok" -> submitCod(bot, chatId, messageId, shipper);
            case "cf" -> showCodFund(bot, chatId, messageId, shipper);
            case "dt" -> showDeliveredToday(bot, chatId, messageId, shipper);
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
        int deliveredToday = shipperBotService.getDeliveredToday(shipper.getCourierCode()).size();

        String text = "<b>Xin chào " + esc(shipper.getFullName()) + "!</b>\n"
                + "Bưu cục: " + esc(safe(shipper.getStationCode())) + "\n"
                + "Ca trực: " + shiftLabel(shipper.getShiftStatus()) + "\n"
                + "Đang giữ: " + activeOrders + " đơn · Giao hôm nay: " + deliveredToday
                + " · Chờ nộp quỹ: " + pendingCod;

        InlineKeyboardMarkup keyboard = markup(List.of(
                row(cb("📦 Đơn cần giao (" + activeOrders + ")", "o:ALL:0")),
                row(cb("💰 Quỹ COD (" + pendingCod + ")", "cf")),
                row(cb("✅ Đã giao hôm nay (" + deliveredToday + ")", "dt")),
                row(cb("🔄 Đổi ca trực", "s"), cb("📈 Dự báo ca mai", "f"))
        ));

        if (messageId != null) {
            bot.editHtml(chatId, messageId, text, keyboard);
        } else {
            bot.sendHtml(chatId, text, keyboard);
        }
    }

    private void showOrders(TelegramBot bot, String chatId, Integer messageId,
                            ShipperLookupResponse shipper, String filter, int page) {
        String normalizedFilter = filter == null || filter.isBlank() ? "ALL" : filter.toUpperCase();
        List<ShipmentDetailResponse> orders = shipperBotService.getOrders(shipper.getCourierCode(), normalizedFilter);

        String title = switch (normalizedFilter) {
            case "OUT" -> "Đơn cần giao";
            case "FAILED" -> "Đơn giao thất bại";
            case "RETURN" -> "Đơn hoàn";
            default -> "Tất cả đơn đang xử lý";
        };

        List<List<InlineKeyboardButton>> rows = new ArrayList<>();
        rows.add(row(
                cb(marker(normalizedFilter, "OUT") + "Cần giao", "o:OUT:0"),
                cb(marker(normalizedFilter, "FAILED") + "Thất bại", "o:FAILED:0")));
        rows.add(row(
                cb(marker(normalizedFilter, "RETURN") + "Hoàn", "o:RETURN:0"),
                cb(marker(normalizedFilter, "ALL") + "Tất cả", "o:ALL:0")));

        if (orders.isEmpty()) {
            rows.add(row(cb("Menu chính", "m")));
            bot.editHtml(chatId, messageId, "<b>" + title + "</b>\nKhông có đơn nào.", markup(rows));
            return;
        }

        int pages = (int) Math.ceil(orders.size() / (double) PAGE_SIZE);
        int currentPage = Math.max(0, Math.min(page, pages - 1));
        int from = currentPage * PAGE_SIZE;
        int to = Math.min(from + PAGE_SIZE, orders.size());

        StringBuilder text = new StringBuilder("<b>").append(title).append("</b> · Trang ")
                .append(currentPage + 1).append("/").append(pages).append("\n");
        for (int i = from; i < to; i++) {
            ShipmentDetailResponse order = orders.get(i);
            text.append("\n").append(statusBadge(order.getCurrentStatus())).append(" <b>")
                    .append(esc(order.getTrackingCode())).append("</b> · ")
                    .append(esc(shortText(order.getReceiverName(), 20)))
                    .append(" · ").append(formatMoney(codOf(order)));
        }

        for (int i = from; i < to; i++) {
            ShipmentDetailResponse order = orders.get(i);
            String label = order.getTrackingCode()
                    + (order.getReceiverName() != null ? " · " + shortText(order.getReceiverName(), 14) : "");
            rows.add(row(cb(label, "d:" + order.getTrackingCode())));
        }

        List<InlineKeyboardButton> nav = new ArrayList<>();
        if (currentPage > 0) {
            nav.add(cb("‹ Trước", "o:" + normalizedFilter + ":" + (currentPage - 1)));
        }
        if (currentPage < pages - 1) {
            nav.add(cb("Sau ›", "o:" + normalizedFilter + ":" + (currentPage + 1)));
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
                    markup(List.of(row(cb("Danh sách", "o:ALL:0"), cb("Menu", "m")))));
            return;
        }

        String status = safe(order.getCurrentStatus());
        boolean isReturnStage = "RETURNING".equalsIgnoreCase(status) || "OUT_FOR_RETURN".equalsIgnoreCase(status);

        StringBuilder text = new StringBuilder()
                .append(statusBadge(status)).append(" <b>").append(esc(order.getTrackingCode())).append("</b>\n");
        if (isReturnStage) {
            text.append("Người gửi: ").append(esc(safe(order.getSenderName()))).append("\n")
                    .append("SĐT: ").append(esc(safe(order.getSenderPhone()))).append("\n")
                    .append("Địa chỉ hoàn: ").append(esc(safe(order.getSenderAddress()))).append("\n")
                    .append("Cước hoàn (50%): ").append(formatMoney(shipperBotService.calculateReturnFee(order))).append("\n");
        } else {
            text.append("Người nhận: ").append(esc(safe(order.getReceiverName()))).append("\n")
                    .append("SĐT: ").append(esc(safe(order.getReceiverPhone()))).append("\n")
                    .append("Địa chỉ: ").append(esc(safe(order.getReceiverAddress()))).append("\n")
                    .append("COD: ").append(formatMoney(codOf(order))).append("\n");
        }
        text.append("Dịch vụ: ").append(esc(safe(order.getServiceType()))).append("\n")
                .append("Trạng thái: ").append(esc(status));

        List<List<InlineKeyboardButton>> rows = new ArrayList<>();
        switch (status.toUpperCase()) {
            case "OUT_FOR_DELIVERY" -> {
                rows.add(row(cb("✅ Giao OK", "dl:" + trackingCode), cb("⚠️ Thất bại", "fl:" + trackingCode)));
                if (codOf(order).compareTo(BigDecimal.ZERO) > 0) {
                    rows.add(row(cb("📱 Thu COD qua VietQR", "dlq:" + trackingCode)));
                }
            }
            case "DELIVERY_FAILED" -> {
                rows.add(row(cb("🔁 Tái phát", "rt:" + trackingCode), cb("⚠️ Thất bại lại", "fl:" + trackingCode)));
            }
            case "RETURNING" -> rows.add(row(cb("📦 Nhận phát hoàn", "ar:" + trackingCode)));
            case "OUT_FOR_RETURN" -> rows.add(row(cb("🏠 Đã trả người gửi", "rr:" + trackingCode)));
            default -> { }
        }

        String phone = isReturnStage ? order.getSenderPhone() : order.getReceiverPhone();
        if (phone != null && !phone.isBlank()) {
            rows.add(row(url("📞 Gọi khách", "tel:" + phone.replaceAll("[^+0-9]", ""))));
        }
        rows.add(row(cb("Danh sách", "o:ALL:0"), cb("Menu", "m")));

        bot.editHtml(chatId, messageId, text.toString(), markup(rows));
    }

    private void showDeliverChooser(TelegramBot bot, String chatId, Integer messageId, String trackingCode) {
        ShipmentDetailResponse order = shipperBotService.getOrder(trackingCode);
        if (order == null) {
            return;
        }
        BigDecimal cod = codOf(order);
        StringBuilder text = new StringBuilder()
                .append("✅ <b>Xác nhận giao thành công</b>\n")
                .append(esc(order.getTrackingCode())).append("\n")
                .append("Người nhận: ").append(esc(safe(order.getReceiverName()))).append("\n")
                .append("Thu COD: ").append(formatMoney(cod));

        List<List<InlineKeyboardButton>> rows = new ArrayList<>();
        if (cod.compareTo(BigDecimal.ZERO) > 0) {
            rows.add(row(cb("💵 Thu tiền mặt", "dlc:" + trackingCode), cb("📱 Thu VietQR", "dlq:" + trackingCode)));
        } else {
            rows.add(row(cb("✅ Xác nhận đã giao", "dlc:" + trackingCode)));
        }
        rows.add(row(cb("Huỷ", "d:" + trackingCode), cb("Menu", "m")));
        bot.editHtml(chatId, messageId, text.toString(), markup(rows));
    }

    private void doDeliver(TelegramBot bot, String chatId, Integer messageId,
                           ShipperLookupResponse shipper, String trackingCode) {
        if (!shipperBotService.isOrderOwnedBy(shipper.getCourierCode(), trackingCode)) {
            bot.editHtml(chatId, messageId, "Đơn này không thuộc quyền phát của bạn.",
                    markup(List.of(row(cb("Danh sách", "o:ALL:0"), cb("Menu", "m")))));
            return;
        }
        ShipmentDetailResponse updated = shipperBotService.markDelivered(shipper.getCourierCode(), trackingCode);
        String status = updated != null ? safe(updated.getCurrentStatus()) : "DELIVERED";
        BigDecimal cod = updated != null ? codOf(updated) : BigDecimal.ZERO;

        String text = "🎉 <b>Đã ghi nhận giao thành công!</b>\n"
                + esc(trackingCode) + " → " + esc(status) + "\n"
                + (cod.compareTo(BigDecimal.ZERO) > 0 ? formatMoney(cod) + " đã vào danh sách chờ nộp quỹ." : "Không có tiền COD.");

        List<List<InlineKeyboardButton>> rows = new ArrayList<>();
        if (cod.compareTo(BigDecimal.ZERO) > 0) {
            rows.add(row(cb("💰 Nộp quỹ ngay", "c")));
        }
        rows.add(row(cb("Danh sách đơn", "o:ALL:0"), cb("Menu", "m")));
        bot.editHtml(chatId, messageId, text, markup(rows));
    }

    private void createCodQr(TelegramBot bot, String chatId, Integer messageId,
                             ShipperLookupResponse shipper, String trackingCode) {
        if (!shipperBotService.isOrderOwnedBy(shipper.getCourierCode(), trackingCode)) {
            bot.editHtml(chatId, messageId, "Đơn này không thuộc quyền phát của bạn.",
                    markup(List.of(row(cb("Danh sách", "o:ALL:0"), cb("Menu", "m")))));
            return;
        }
        bot.editHtml(chatId, messageId, "⏳ Đang tạo mã VietQR thu COD...", null);
        bot.uploadingPhoto(chatId);
        try {
            PaymentResponse payment = shipperBotService.createCodQr(shipper.getCourierCode(), trackingCode);
            sendQr(bot, chatId, shipper, trackingCode, payment, "COD");
        } catch (Exception e) {
            log.warn("[SHIPPER-BOT] Không tạo được QR COD cho {}: {}", trackingCode, e.getMessage());
            bot.editHtml(chatId, messageId, "⚠️ Không tạo được mã QR: " + esc(e.getMessage()),
                    markup(List.of(row(cb("Quay lại", "d:" + trackingCode), cb("Menu", "m")))));
        }
    }

    private void sendQr(TelegramBot bot, String chatId, ShipperLookupResponse shipper,
                        String trackingCode, PaymentResponse payment, String type) {
        String amount = payment != null ? formatMoney(payment.getAmount()) : "0đ";
        StringBuilder caption = new StringBuilder()
                .append("📱 <b>Quét VietQR để thanh toán</b>\n")
                .append("Đơn: ").append(esc(trackingCode)).append("\n")
                .append("Số tiền: <b>").append(amount).append("</b>\n")
                .append("Nội dung: ").append(esc(payment != null && payment.getTrackingCode() != null
                        ? ("COD".equals(type) ? "COD " : "CUOC HOAN ") + trackingCode : ""))
                .append("\n");

        List<List<InlineKeyboardButton>> rows = new ArrayList<>();
        rows.add(row(cb("🔄 Kiểm tra thanh toán", "chk:" + trackingCode)));
        if (paymentMockEnabled) {
            rows.add(row(cb("🧪 Mock thanh toán (dev)", "mock:" + trackingCode)));
        }
        rows.add(row(cb("Quay lại", "d:" + trackingCode), cb("Menu", "m")));
        InlineKeyboardMarkup keyboard = markup(rows);

        Integer photoMessageId = null;
        if (payment != null && payment.getQrUrl() != null && !payment.getQrUrl().isBlank()) {
            caption.append("\nNgân hàng: ").append(esc(safe(payment.getBankCode())))
                    .append(" · STK: ").append(esc(safe(payment.getAccountNo())));
            photoMessageId = bot.sendPhoto(chatId, payment.getQrUrl(), caption.toString(), keyboard);
        }

        if (photoMessageId == null) {
            caption.append("\n\n<i>(Không tải được ảnh QR, vui lòng chuyển khoản theo thông tin trên.)</i>");
            bot.sendHtml(chatId, caption.toString(), keyboard);
        }

        shipperOrderIndexService.registerPaymentWatch(
                trackingCode, chatId, photoMessageId, shipper.getCourierCode(), type,
                payment != null && payment.getAmount() != null ? payment.getAmount().toPlainString() : "0");
    }

    private void checkPayment(TelegramBot bot, String chatId, Integer messageId, String trackingCode) {
        PaymentResponse payment = shipperBotService.getPayment(trackingCode);
        String status = payment != null ? safe(payment.getStatus()) : "KHÔNG TÌM THẤY";
        String text = "🔄 <b>Trạng thái giao dịch</b>\nĐơn <code>" + esc(trackingCode) + "</code>\n"
                + "Trạng thái: " + esc(status)
                + ("SUCCESS".equalsIgnoreCase(status)
                    ? "\n\n🎉 Đã nhận tiền! Hệ thống đang hoàn tất đơn (vài giây)."
                    : "\n\nĐang chờ khách quét mã...");
        bot.editHtml(chatId, messageId, text, markup(List.of(row(cb("Quay lại", "d:" + trackingCode), cb("Menu", "m")))));
    }

    private void mockPay(TelegramBot bot, String chatId, Integer messageId, String trackingCode) {
        if (!paymentMockEnabled) {
            bot.editHtml(chatId, messageId, "Chức năng mock thanh toán đang tắt.",
                    markup(List.of(row(cb("Quay lại", "d:" + trackingCode), cb("Menu", "m")))));
            return;
        }
        try {
            shipperBotService.mockPay(trackingCode);
            bot.editHtml(chatId, messageId, "🧪 Đã giả lập thanh toán cho đơn " + esc(trackingCode)
                            + ".\nHệ thống sẽ tự xác nhận trong vài giây...",
                    markup(List.of(row(cb("Kiểm tra", "chk:" + trackingCode), cb("Menu", "m")))));
        } catch (Exception e) {
            bot.editHtml(chatId, messageId, "⚠️ Mock thất bại: " + esc(e.getMessage()),
                    markup(List.of(row(cb("Quay lại", "d:" + trackingCode), cb("Menu", "m")))));
        }
    }

    private void showFailureReasons(TelegramBot bot, String chatId, Integer messageId, String trackingCode) {
        String text = "⚠️ <b>Lý do giao thất bại</b>\n" + esc(safe(trackingCode));
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
                    markup(List.of(row(cb("Danh sách", "o:ALL:0"), cb("Menu", "m")))));
            return;
        }
        ShipmentDetailResponse updated = shipperBotService.markDeliveryFailed(
                shipper.getCourierCode(), trackingCode, reasonCode);
        String status = updated != null ? safe(updated.getCurrentStatus()) : "DELIVERY_FAILED";
        String reasonLabel = FAILURE_REASON_LABELS.getOrDefault(reasonCode, "Giao thất bại");

        StringBuilder text = new StringBuilder("⚠️ <b>Đã ghi nhận giao thất bại</b>\n")
                .append(esc(trackingCode)).append("\n")
                .append("Lý do: ").append(esc(reasonLabel)).append("\n")
                .append("Trạng thái hiện tại: ").append(esc(status));
        if ("RETURNING".equalsIgnoreCase(status)) {
            text.append("\n\n🔁 Đơn đã thất bại 3 lần và tự động chuyển hoàn về người gửi.");
        }
        bot.editHtml(chatId, messageId, text.toString(),
                markup(List.of(row(cb("Chi tiết đơn", "d:" + trackingCode), cb("Menu", "m")))));
    }

    private void doRetry(TelegramBot bot, String chatId, Integer messageId,
                         ShipperLookupResponse shipper, String trackingCode) {
        if (!shipperBotService.isOrderOwnedBy(shipper.getCourierCode(), trackingCode)) {
            bot.editHtml(chatId, messageId, "Đơn này không thuộc quyền phát của bạn.",
                    markup(List.of(row(cb("Danh sách", "o:ALL:0"), cb("Menu", "m")))));
            return;
        }
        shipperBotService.retryDelivery(shipper.getCourierCode(), trackingCode);
        bot.editHtml(chatId, messageId,
                "🔁 <b>Đã nhận tái phát</b>\nĐơn <code>" + esc(trackingCode) + "</code> chuyển sang đang phát.",
                markup(List.of(row(cb("Chi tiết đơn", "d:" + trackingCode), cb("Danh sách", "o:ALL:0"), cb("Menu", "m")))));
    }

    private void doAcceptReturn(TelegramBot bot, String chatId, Integer messageId,
                                ShipperLookupResponse shipper, String trackingCode) {
        if (!shipperBotService.isOrderOwnedBy(shipper.getCourierCode(), trackingCode)) {
            bot.editHtml(chatId, messageId, "Đơn này không thuộc quyền phát của bạn.",
                    markup(List.of(row(cb("Danh sách", "o:ALL:0"), cb("Menu", "m")))));
            return;
        }
        shipperBotService.acceptReturn(shipper.getCourierCode(), trackingCode);
        bot.editHtml(chatId, messageId,
                "📦 <b>Đã nhận phát hoàn</b>\nĐơn <code>" + esc(trackingCode) + "</code> đang phát hoàn về người gửi.",
                markup(List.of(row(cb("Chi tiết đơn", "d:" + trackingCode), cb("Danh sách", "o:ALL:0"), cb("Menu", "m")))));
    }

    private void showReturnChooser(TelegramBot bot, String chatId, Integer messageId,
                                   ShipperLookupResponse shipper, String trackingCode) {
        ShipmentDetailResponse order = shipperBotService.getOrder(trackingCode);
        if (order == null) {
            return;
        }
        BigDecimal fee = shipperBotService.calculateReturnFee(order);
        String text = "🏠 <b>Xác nhận trả hàng cho người gửi</b>\n"
                + esc(trackingCode) + "\n"
                + "Người gửi: " + esc(safe(order.getSenderName())) + "\n"
                + "Địa chỉ: " + esc(safe(order.getSenderAddress())) + "\n"
                + "Cước hoàn (50%): <b>" + formatMoney(fee) + "</b>";

        List<List<InlineKeyboardButton>> rows = new ArrayList<>();
        if (fee.compareTo(BigDecimal.ZERO) > 0) {
            rows.add(row(cb("💵 Thu tiền mặt", "rrc:" + trackingCode), cb("📱 Thu VietQR", "rrq:" + trackingCode)));
        } else {
            rows.add(row(cb("✅ Xác nhận đã trả", "rrc:" + trackingCode)));
        }
        rows.add(row(cb("Quay lại", "d:" + trackingCode), cb("Menu", "m")));
        bot.editHtml(chatId, messageId, text, markup(rows));
    }

    private void doReturnCash(TelegramBot bot, String chatId, Integer messageId,
                              ShipperLookupResponse shipper, String trackingCode) {
        if (!shipperBotService.isOrderOwnedBy(shipper.getCourierCode(), trackingCode)) {
            bot.editHtml(chatId, messageId, "Đơn này không thuộc quyền phát của bạn.",
                    markup(List.of(row(cb("Danh sách", "o:ALL:0"), cb("Menu", "m")))));
            return;
        }
        shipperBotService.confirmReturned(shipper.getCourierCode(), trackingCode, false);
        bot.editHtml(chatId, messageId,
                "🎉 <b>Đã hoàn thành phát hoàn!</b>\nĐơn <code>" + esc(trackingCode) + "</code> đã trả tận tay người gửi.",
                markup(List.of(row(cb("Danh sách", "o:ALL:0"), cb("Menu", "m")))));
    }

    private void createReturnQr(TelegramBot bot, String chatId, Integer messageId,
                                ShipperLookupResponse shipper, String trackingCode) {
        if (!shipperBotService.isOrderOwnedBy(shipper.getCourierCode(), trackingCode)) {
            bot.editHtml(chatId, messageId, "Đơn này không thuộc quyền phát của bạn.",
                    markup(List.of(row(cb("Danh sách", "o:ALL:0"), cb("Menu", "m")))));
            return;
        }
        bot.editHtml(chatId, messageId, "⏳ Đang tạo mã VietQR cước hoàn...", null);
        bot.uploadingPhoto(chatId);
        try {
            PaymentResponse payment = shipperBotService.createReturnQr(shipper.getCourierCode(), trackingCode);
            sendQr(bot, chatId, shipper, trackingCode, payment, "RETURN_FEE");
        } catch (Exception e) {
            log.warn("[SHIPPER-BOT] Không tạo được QR cước hoàn cho {}: {}", trackingCode, e.getMessage());
            bot.editHtml(chatId, messageId, "⚠️ Không tạo được mã QR: " + esc(e.getMessage()),
                    markup(List.of(row(cb("Quay lại", "d:" + trackingCode), cb("Menu", "m")))));
        }
    }

    // ------------------------------------------------------------------ COD

    private void showCodFund(TelegramBot bot, String chatId, Integer messageId, ShipperLookupResponse shipper) {
        Map<String, List<ShipmentDetailResponse>> groups = shipperBotService.getCodGroups(shipper.getCourierCode());
        List<ShipmentDetailResponse> pending = groups.getOrDefault("pending", List.of());
        List<ShipmentDetailResponse> sent = groups.getOrDefault("sent", List.of());
        List<ShipmentDetailResponse> settled = groups.getOrDefault("settled", List.of());

        String text = "💰 <b>Quỹ COD</b>\n"
                + "Đang giữ (chưa nộp): " + pending.size() + " đơn · " + formatMoney(sumCod(pending)) + "\n"
                + "Chờ bưu cục xác nhận: " + sent.size() + " đơn · " + formatMoney(sumCod(sent)) + "\n"
                + "Đã thu quỹ: " + settled.size() + " đơn · " + formatMoney(sumCod(settled));

        List<List<InlineKeyboardButton>> rows = new ArrayList<>();
        if (!pending.isEmpty()) {
            rows.add(row(cb("📤 Nộp quỹ (" + formatMoney(sumCod(pending)) + ")", "c")));
        }
        rows.add(row(cb("Menu chính", "m")));
        bot.editHtml(chatId, messageId, text, markup(rows));
    }

    private void showCod(TelegramBot bot, String chatId, Integer messageId, ShipperLookupResponse shipper) {
        List<ShipmentDetailResponse> pending = shipperBotService.getPendingCodOrders(shipper.getCourierCode());
        Set<String> selected = codSelection.computeIfAbsent(chatId, k -> new LinkedHashSet<>());
        selected.removeIf(code -> pending.stream().noneMatch(p -> p.getTrackingCode().equals(code)));

        if (pending.isEmpty()) {
            codSelection.remove(chatId);
            bot.editHtml(chatId, messageId, "💰 <b>Nộp quỹ COD</b>\nKhông có đơn nào chờ nộp quỹ.",
                    markup(List.of(row(cb("Menu chính", "m")))));
            return;
        }

        BigDecimal selectedTotal = pending.stream()
                .filter(p -> selected.contains(p.getTrackingCode()))
                .map(this::codOf)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        String text = "💰 <b>Nộp quỹ COD</b>\n"
                + esc(safe(shipper.getFullName())) + " · " + esc(safe(shipper.getStationCode())) + "\n"
                + "Đã chọn: " + selected.size() + "/" + pending.size() + " đơn\n"
                + "Tổng: " + formatMoney(selectedTotal);

        List<List<InlineKeyboardButton>> rows = new ArrayList<>();
        for (ShipmentDetailResponse order : pending) {
            boolean checked = selected.contains(order.getTrackingCode());
            String label = (checked ? "☑ " : "☐ ") + order.getTrackingCode() + " · " + formatMoney(codOf(order));
            rows.add(row(cb(label, "ct:" + order.getTrackingCode())));
        }
        boolean allSelected = selected.size() == pending.size();
        rows.add(row(cb(allSelected ? "Bỏ chọn tất cả" : "Chọn tất cả", "cx")));
        if (!selected.isEmpty()) {
            rows.add(row(cb("💸 Xác nhận nộp (" + formatMoney(selectedTotal) + ")", "cok")));
        }
        rows.add(row(cb("Quỹ COD", "cf"), cb("Menu", "m")));

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
                "✅ <b>Đã gửi yêu cầu nộp quỹ</b>\n" + count + " đơn đã chuyển sang trạng thái chờ thủ quỹ duyệt.",
                markup(List.of(row(cb("Quỹ COD", "cf"), cb("Menu", "m")))));
    }

    private void showDeliveredToday(TelegramBot bot, String chatId, Integer messageId, ShipperLookupResponse shipper) {
        List<ShipmentDetailResponse> orders = shipperBotService.getDeliveredToday(shipper.getCourierCode());
        BigDecimal totalCod = sumCod(orders);
        StringBuilder text = new StringBuilder("✅ <b>Đã giao hôm nay</b> · ").append(orders.size()).append(" đơn\n")
                .append("Tổng COD: ").append(formatMoney(totalCod)).append("\n");
        int limit = Math.min(orders.size(), 15);
        for (int i = 0; i < limit; i++) {
            ShipmentDetailResponse order = orders.get(i);
            text.append("\n• <code>").append(esc(order.getTrackingCode())).append("</code> · ")
                    .append(esc(shortText(order.getReceiverName(), 18))).append(" · ")
                    .append(formatMoney(codOf(order)));
        }
        if (orders.size() > limit) {
            text.append("\n... và ").append(orders.size() - limit).append(" đơn khác");
        }
        bot.editHtml(chatId, messageId, text.toString(), markup(List.of(row(cb("Menu chính", "m")))));
    }

    // ------------------------------------------------------------------ shift / forecast

    private void showShift(TelegramBot bot, String chatId, Integer messageId, ShipperLookupResponse shipper) {
        boolean onDuty = !"OFF_DUTY".equalsIgnoreCase(safe(shipper.getShiftStatus()));
        String text = "🔄 <b>Ca trực</b>\nHiện tại: " + shiftLabel(shipper.getShiftStatus());
        String button = onDuty ? "🌙 Tan ca (OFF_DUTY)" : "☀️ Vào ca (ON_DUTY)";
        bot.editHtml(chatId, messageId, text,
                markup(List.of(row(cb(button, "st")), row(cb("Menu chính", "m")))));
    }

    private void doToggleShift(TelegramBot bot, String chatId, Integer messageId, ShipperLookupResponse shipper) {
        ShipperLookupResponse updated = shipperBotService.toggleShift(shipper.getCourierCode());
        String text = "🔄 <b>Ca trực</b>\nĐã cập nhật: " + shiftLabel(updated != null ? updated.getShiftStatus() : null);
        bot.editHtml(chatId, messageId, text, markup(List.of(row(cb("Menu chính", "m")))));
    }

    private void showForecast(TelegramBot bot, String chatId, Integer messageId, ShipperLookupResponse shipper) {
        ShipperForecastResponse forecast = shipperBotService.getForecast(shipper.getCourierCode());
        if (forecast == null) {
            bot.editHtml(chatId, messageId, "Chưa có số liệu dự báo cho ca tới.",
                    markup(List.of(row(cb("Menu chính", "m")))));
            return;
        }
        String text = "📈 <b>Dự báo ca mai</b>\n"
                + "Bưu tá: " + esc(safe(forecast.getFullName())) + "\n"
                + "Khu vực: " + esc(safe(forecast.getAssignedZone())) + "\n"
                + "Đơn dự kiến: " + forecast.getEstimatedOrdersCount() + "\n"
                + "Công suất ca: " + String.format("%.0f", forecast.getUtilizationRate()) + "%\n"
                + "COD dự kiến: " + formatMoney(forecast.getEstimatedCodAmount());
        bot.editHtml(chatId, messageId, text, markup(List.of(row(cb("Menu chính", "m")))));
    }

    // ------------------------------------------------------------------ helpers

    private int pageArg(String[] parts) {
        if (parts.length < 3) {
            return 0;
        }
        try {
            return Integer.parseInt(parts[2]);
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    private String arg(String[] parts, int index) {
        return parts.length > index ? parts[index] : null;
    }

    private String marker(String current, String value) {
        return current.equals(value) ? "• " : "";
    }

    private String statusBadge(String status) {
        if (status == null) {
            return "•";
        }
        return switch (status.toUpperCase()) {
            case "OUT_FOR_DELIVERY" -> "🚚";
            case "DELIVERY_FAILED" -> "⚠️";
            case "RETURNING" -> "🔁";
            case "OUT_FOR_RETURN" -> "🏠";
            case "DELIVERED" -> "✅";
            default -> "📦";
        };
    }

    private BigDecimal codOf(ShipmentDetailResponse order) {
        if (order == null || order.getCodAmount() == null) {
            return BigDecimal.ZERO;
        }
        return order.getCodAmount();
    }

    private BigDecimal sumCod(List<ShipmentDetailResponse> orders) {
        return orders.stream().map(this::codOf).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private String formatMoney(BigDecimal amount) {
        if (amount == null) {
            return "0đ";
        }
        return String.format("%,.0fđ", amount.doubleValue());
    }

    private String shiftLabel(String shiftStatus) {
        return "OFF_DUTY".equalsIgnoreCase(safe(shiftStatus)) ? "Đã tan ca" : "Đang trực";
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