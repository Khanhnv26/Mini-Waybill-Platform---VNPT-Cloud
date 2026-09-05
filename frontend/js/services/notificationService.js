/**
 * VNPT CLOUD - NOTIFICATION SERVICE CLIENT
 * Lịch sử gửi thông báo đến khách hàng
 */

(function () {
    const NotificationService = {
        async getByTrackingCode(trackingCode) {
            if (!trackingCode) return [];
            try {
                const response = await Api.get(`/api/notifications/${trackingCode}`);
                if (!response.ok) return [];
                return await response.json();
            } catch {
                return [];
            }
        }
    };

    window.NotificationService = NotificationService;
})();
