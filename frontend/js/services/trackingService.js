/**
 * VNPT CLOUD - TRACKING SERVICE CLIENT
 * Quản lý theo dõi hành trình và cập nhật nghiệp vụ trạng thái
 */

(function () {
    const TrackingService = {
        async getTracking(trackingCode) {
            const response = await Api.get(`/api/tracking/${trackingCode}`);
            if (!response.ok) {
                throw new Error(`Không tìm thấy dữ liệu cho mã bưu gửi: ${trackingCode}`);
            }
            return response.json();
        },

        async updateStatus(trackingCode, status, locationCode, note) {
            const response = await Api.post(`/api/tracking/${trackingCode}/status`, {
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
