/**
 * VNPT CLOUD - SHIPPER SERVICE CLIENT
 * Danh bạ bưu tá: tạo, sửa, ngừng hoạt động.
 */
(function () {
    function extractErrorMessage(errData, defaultMsg) {
        if (!errData) return defaultMsg;
        if (typeof errData === 'string') return errData;
        let msg = errData.error || errData.message;
        if (!msg && typeof errData === 'object') {
            const fieldErrors = Object.entries(errData)
                .filter(([key]) => key !== 'errorCode' && key !== 'timestamp' && key !== 'status')
                .map(([, value]) => `${value}`)
                .join('; ');
            if (fieldErrors) msg = fieldErrors;
        }
        return msg || defaultMsg;
    }

    const ShipperDirectoryService = {
        async list() {
            const response = await Api.get('/api/shippers');
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(extractErrorMessage(errData, 'Không thể tải danh bạ bưu tá'));
            }
            return response.json();
        },

        async create(payload) {
            const response = await Api.post('/api/shippers', payload);
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(extractErrorMessage(errData, 'Không thể thêm bưu tá'));
            }
            return response.json();
        },

        async update(id, payload) {
            const response = await Api.put(`/api/shippers/${encodeURIComponent(id)}`, payload);
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(extractErrorMessage(errData, 'Không thể cập nhật bưu tá'));
            }
            return response.json();
        },

        async deactivate(id) {
            const response = await Api.delete(`/api/shippers/${encodeURIComponent(id)}`);
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(extractErrorMessage(errData, 'Không thể ngừng hoạt động bưu tá'));
            }
            return response.json();
        }
    };

    window.ShipperDirectoryService = ShipperDirectoryService;
})();
