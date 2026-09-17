/**
 * VNPT CLOUD - NOTIFICATION SERVICE CLIENT
 * Lịch sử gửi thông báo đến khách hàng & Trung tâm thông báo Topbar
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
        },

        async getMyNotifications() {
            try {
                const response = await Api.get('/api/notifications', {}, { silent: true });
                if (!response.ok) return [];
                return await response.json();
            } catch {
                return [];
            }
        },

        async markAsRead(id) {
            if (!id) return false;
            try {
                const response = await Api.put(`/api/notifications/${id}/read`, {}, {}, { silent: true });
                return response.ok;
            } catch {
                return false;
            }
        },

        async markAllAsRead() {
            try {
                const response = await Api.put('/api/notifications/read-all', {}, {}, { silent: true });
                return response.ok;
            } catch {
                return false;
            }
        }
    };

    window.NotificationService = NotificationService;
})();
