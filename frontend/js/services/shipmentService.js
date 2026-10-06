(function () {
    const ShipmentService = {
        async createShipment(payload) {
            const response = await Api.post('/api/shipments', payload);
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                let msg = errData.error || errData.message;
                if (!msg) {
                    const fieldErrors = Object.entries(errData)
                        .filter(([k]) => k !== 'errorCode' && k !== 'timestamp' && k !== 'status')
                        .map(([k, v]) => `${v}`)
                        .join('; ');
                    if (fieldErrors) msg = fieldErrors;
                }
                throw new Error(msg || 'Lỗi khi khởi tạo bưu gửi (400 Bad Request)');
            }
            return response.json();
        },

        async getShipments(customerId, options = {}) {
            let url = '/api/shipments';
            if (customerId) {
                url += `?customerId=${customerId}`;
            }
            const response = await Api.get(url, {}, options);
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || errData.message || 'Không thể tải danh sách vận đơn');
            }
            return response.json();
        },

        async getAll(options = {}) {
            return this.getShipments(null, options);
        },

        /**
         * Chi tiết bưu gửi theo mã vận đơn.
         * Dùng fetch trực tiếp (không qua Api.get) để KHÔNG kích hoạt
         * toast lỗi 403 toàn cục khi khách vãng lai hoặc user không có
         * quyền shipment:read_all tra cứu đơn của người khác.
         */
        async getByCode(trackingCode) {
            if (!trackingCode) return null;
            try {
                const headers = { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' };
                if (typeof Auth !== 'undefined') {
                    const token = Auth.getToken();
                    if (token) headers['Authorization'] = `Bearer ${token}`;
                }
                const base = (['3000', '80', '443', ''].includes(window.location.port) && window.location.protocol.startsWith('http')) ? '' : 'http://localhost:8080';
                const response = await fetch(`${base}/api/shipments/${encodeURIComponent(trackingCode)}`, { headers });
                if (!response.ok) return null;
                return await response.json();
            } catch (e) {
                return null;
            }
        },

        async cancelShipment(trackingCode, payload = {}) {
            const response = await Api.post(`/api/shipments/${encodeURIComponent(trackingCode)}/cancel`, payload);
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || errData.message || 'Lỗi khi hủy vận đơn');
            }
            return response.json();
        },

        async submitCodSettlement(trackingCodes, courierId = '') {
            const payload = {
                trackingCodes: Array.isArray(trackingCodes) ? trackingCodes : [trackingCodes],
                courierId
            };
            const response = await Api.post('/api/shipments/cod/submit-settlement', payload);
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || errData.message || 'Lỗi khi gửi yêu cầu nộp quỹ COD');
            }
            return response.json();
        },

        async confirmCodSettlement(trackingCodes, officerId = '') {
            const payload = {
                trackingCodes: Array.isArray(trackingCodes) ? trackingCodes : [trackingCodes],
                officerId
            };
            const response = await Api.post('/api/shipments/cod/confirm-settlement', payload);
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || errData.message || 'Lỗi khi xác nhận thu quỹ COD');
            }
            return response.json();
        },

        async getReturnQuote(trackingCode) {
            const response = await Api.get(`/api/shipments/${encodeURIComponent(trackingCode)}/return-quote`);
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || errData.message || 'Lỗi khi lấy báo giá cước hoàn');
            }
            return response.json();
        },

        async createReturnRequest(trackingCode, payload) {
            const response = await Api.post(`/api/shipments/${encodeURIComponent(trackingCode)}/return-requests`, payload);
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || errData.message || 'Lỗi khi tạo yêu cầu hoàn hàng');
            }
            return response.json();
        },

        async getReturnRequest(trackingCode) {
            const response = await Api.get(`/api/shipments/${encodeURIComponent(trackingCode)}/return-request`);
            if (!response.ok) {
                if (response.status === 404) return null;
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || errData.message || 'Lỗi khi lấy thông tin yêu cầu hoàn');
            }
            return response.json();
        },

        async listReturnRequests(status = null) {
            let url = '/api/shipments/return-requests';
            if (status) {
                url += `?status=${encodeURIComponent(status)}`;
            }
            const response = await Api.get(url);
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || errData.message || 'Lỗi khi tải danh sách yêu cầu hoàn');
            }
            return response.json();
        },

        async updatePostalFault(trackingCode, payload) {
            const response = await Api.patch(`/api/shipments/${encodeURIComponent(trackingCode)}/return-request/postal-fault`, payload);
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || errData.message || 'Lỗi khi cập nhật lỗi bưu chính');
            }
            return response.json();
        },

        async getPendingFailureDecisions() {
            const response = await Api.get('/api/shipments/pending-decisions');
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || errData.message || 'Lỗi khi tải danh sách đơn cần xử lý giao thất bại');
            }
            return response.json();
        },

        async submitFailureDecision(trackingCode, payload) {
            const response = await Api.post(`/api/shipments/${encodeURIComponent(trackingCode)}/failure-decision`, payload);
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || errData.message || 'Lỗi khi xử lý quyết định giao không thành công');
            }
            return response.json();
        }
    };

    window.ShipmentService = ShipmentService;
})();
