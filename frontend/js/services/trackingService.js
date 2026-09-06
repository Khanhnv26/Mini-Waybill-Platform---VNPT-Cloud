/**
 * VNPT CLOUD - TRACKING SERVICE CLIENT
 * Quản lý theo dõi hành trình và cập nhật nghiệp vụ trạng thái
 */

(function () {
    const TrackingService = {
        // Trạng thái hiện tại: { trackingCode, currentStatus, source }
        async getTracking(trackingCode) {
            const response = await Api.get(`/api/tracking/${encodeURIComponent(trackingCode)}`);
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                const err = new Error(errData.message || `Không tìm thấy dữ liệu cho mã bưu gửi: ${trackingCode}`);
                err.status = response.status;
                err.isNotFound = response.status === 404;
                throw err;
            }
            return response.json();
        },

        // Toàn bộ các mốc quét hành trình (TrackingHistory[])
        async getHistory(trackingCode) {
            const response = await Api.get(`/api/tracking/${encodeURIComponent(trackingCode)}/history`);
            if (!response.ok) {
                return [];
            }
            return response.json();
        },

        /**
         * Gộp trạng thái hiện tại + hành trình thành một đối tượng thống nhất cho UI.
         * Backend tách làm 2 endpoint nên phải hợp nhất tại đây.
         */
        async getFullTracking(trackingCode) {
            const [status, history] = await Promise.all([
                this.getTracking(trackingCode),
                this.getHistory(trackingCode).catch(() => [])
            ]);
            return {
                trackingCode: status.trackingCode || trackingCode,
                currentStatus: status.currentStatus,
                source: status.source,
                history: Array.isArray(history) ? history : []
            };
        },

        async updateStatus(trackingCode, status, locationCode, note) {
            const response = await Api.post(`/api/tracking/${encodeURIComponent(trackingCode)}/status`, {
                status,
                locationCode,
                note
            });
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.message || 'Cập nhật nghiệp vụ không thành công');
            }
            return response.json();
        }
    };

    window.TrackingService = TrackingService;
})();
