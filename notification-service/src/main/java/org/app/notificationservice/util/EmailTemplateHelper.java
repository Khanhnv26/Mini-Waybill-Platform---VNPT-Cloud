package org.app.notificationservice.util;

public class EmailTemplateHelper {

    public static String buildShipmentCreatedHtml(String senderName, String trackingCode, String receiverName, String receiverAddress) {
        return buildBaseTemplate(
                "Tạo Vận Đơn Thành Công",
                "#2563eb",
                String.format("<p>Xin chào <strong>%s</strong>,</p>" +
                                "<p>Đơn hàng của bạn đã được khởi tạo thành công trên hệ thống <strong>VNPT Cloud Waybill</strong>.</p>" +
                                "<div style='background:#f1f5f9; padding:15px; border-radius:8px; margin:15px 0;'>" +
                                "<p style='margin:4px 0;'>Mã bưu gửi: <strong style='color:#2563eb; font-size:16px;'>%s</strong></p>" +
                                "<p style='margin:4px 0;'>Người nhận: <strong>%s</strong></p>" +
                                "<p style='margin:4px 0;'>Địa chỉ giao: %s</p>" +
                                "</div>" +
                                "<p>Chúng tôi sẽ tiếp tục thông báo khi bưu tá bắt đầu phát hàng.</p>",
                        senderName, trackingCode, receiverName, receiverAddress)
        );
    }

    public static String buildStatusUpdateHtml(String trackingCode, String status, String location, String note) {
        String badgeColor = "#2563eb";
        String statusTitle = "Cập Nhật Hành Trình";

        if ("OUT_FOR_DELIVERY".equals(status)) {
            badgeColor = "#4f46e5";
            statusTitle = "Bưu Tá Đang Giao Hàng";
        } else if ("DELIVERED".equals(status)) {
            badgeColor = "#16a34a";
            statusTitle = "Giao Hàng Thành Công";
        } else if ("DELIVERY_FAILED".equals(status)) {
            badgeColor = "#dc2626";
            statusTitle = "Giao Hàng Không Thành Công";
        }

        String content = String.format(
                "<p>Đơn hàng <strong>%s</strong> vừa có cập nhật trạng thái mới:</p>" +
                        "<div style='background:#f8fafc; border-left:4px solid %s; padding:15px; margin:15px 0;'>" +
                        "<p style='margin:4px 0;'>Trạng thái: <strong style='color:%s; font-size:15px;'>%s</strong></p>" +
                        "<p style='margin:4px 0;'>Vị trí: <strong>%s</strong></p>" +
                        "<p style='margin:4px 0;'>Ghi chú: <em>%s</em></p>" +
                        "</div>",
                trackingCode, badgeColor, badgeColor, statusTitle, location, note
        );

        return buildBaseTemplate(statusTitle, badgeColor, content);
    }

    private static String buildBaseTemplate(String title, String primaryColor, String bodyContent) {
        return "<!DOCTYPE html>" +
                "<html><head><meta charset='UTF-8'></head>" +
                "<body style='font-family:Arial, sans-serif; background:#f8fafc; margin:0; padding:20px; color:#334155;'>" +
                "<div style='max-width:560px; margin:0 auto; background:#ffffff; border-radius:12px; overflow:hidden; border:1px solid #e2e8f0; box-shadow:0 2px 4px rgba(0,0,0,0.05);'>" +
                "  <div style='background:linear-gradient(135deg, #1e3a8a, " + primaryColor + "); padding:20px; text-align:center; color:#ffffff;'>" +
                "    <h2 style='margin:0; font-size:20px; font-weight:bold;'>VNPT CLOUD WAYBILL</h2>" +
                "    <p style='margin:4px 0 0 0; font-size:12px; opacity:0.9;'>" + title + "</p>" +
                "  </div>" +
                "  <div style='padding:24px; font-size:14px; line-height:1.6;'>" +
                bodyContent +
                "  </div>" +
                "  <div style='background:#f8fafc; border-top:1px solid #e2e8f0; padding:14px; text-align:center; font-size:11px; color:#94a3b8;'>" +
                "    Tổng đài hỗ trợ: 1900 54 54 81 | VNPT Post Logistics Ecosystem" +
                "  </div>" +
                "</div></body></html>";
    }
}