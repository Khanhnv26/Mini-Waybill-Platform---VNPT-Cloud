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
        },

        async sendTelegramTest(chatId, message) {
            const response = await Api.post('/api/notifications/telegram/send', { chatId, message });
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || errData.message || 'Không thể gửi tin nhắn Telegram');
            }
            return response.json();
        }
    };

    window.NotificationService = NotificationService;
})();
