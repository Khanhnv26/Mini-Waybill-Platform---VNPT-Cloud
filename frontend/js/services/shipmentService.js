/**
 * VNPT CLOUD - SHIPMENT SERVICE CLIENT
 * Quản lý khởi tạo đơn hàng và phát hành vận đơn
 */

(function () {
    const ShipmentService = {
        async createShipment(payload) {
            const response = await Api.post('/api/shipments', payload);
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || errData.message || 'Lỗi khi khởi tạo bưu gửi');
            }
            return response.json();
        },

        async getShipments(customerId) {
            let url = '/api/shipments';
            if (customerId) {
                url += `?customerId=${customerId}`;
            }
            const response = await Api.get(url);
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || errData.message || 'Không thể tải danh sách vận đơn');
            }
            return response.json();
        },

        async getAll() {
            return this.getShipments();
        },

        /**
         * Chi tiết bưu gửi theo mã vận đơn.
         * Endpoint yêu cầu đăng nhập; trả về null (không ném lỗi) khi 401/403
         * để khách vãng lai vẫn tra cứu được hành trình.
         */
        async getByCode(trackingCode) {
            if (!trackingCode) return null;
            try {
                const response = await Api.get(`/api/shipments/${encodeURIComponent(trackingCode)}`);
                if (!response.ok) return null;
                return await response.json();
            } catch (e) {
                return null;
            }
        }
    };

    window.ShipmentService = ShipmentService;
})();
