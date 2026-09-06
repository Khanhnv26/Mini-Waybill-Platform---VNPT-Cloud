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
        }
    };

    window.ShipmentService = ShipmentService;
})();
