/**
 * ==============================================================================
 * VNPT WAYBILL PLATFORM - SUPPORT SERVICE CLIENT
 * Cổng giao tiếp Microservice Hỗ Trợ & Khiếu Nại Bưu Gửi (Port 8093 qua Gateway 8080)
 * ==============================================================================
 */

(function () {
    function extractErrorMessage(errData, defaultMsg) {
        if (!errData) return defaultMsg;
        if (typeof errData === 'string') return errData;
        let msg = errData.error || errData.message;
        if (!msg && typeof errData === 'object') {
            const fieldErrors = Object.entries(errData)
                .filter(([k]) => k !== 'errorCode' && k !== 'timestamp' && k !== 'status')
                .map(([k, v]) => `${v}`)
                .join('; ');
            if (fieldErrors) msg = fieldErrors;
        }
        return msg || defaultMsg;
    }

    const SupportService = {
        /**
         * Tạo phiếu khiếu nại bưu gửi mới (Guest hoặc Customer)
         * @param {Object} payload: { trackingCode, creatorName, creatorPhone, creatorEmail, category, priority, title, description }
         */
        async createTicket(payload) {
            const response = await Api.post('/api/tickets', payload, {}, { skip403Toast: true });
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(extractErrorMessage(errData, 'Không thể tạo phiếu khiếu nại'));
            }
            return response.json();
        },

        /**
         * Lấy danh sách phiếu khiếu nại của tài khoản đăng nhập hiện tại
         */
        async getMyTickets() {
            const response = await Api.get('/api/tickets/my-tickets', {}, { skip403Toast: true, silent: true });
            if (!response.ok) {
                return [];
            }
            return response.json();
        },

        /**
         * Tra cứu chi tiết phiếu khiếu nại theo Mã phiếu TKT...
         * @param {string} ticketCode
         */
        async getTicketByCode(ticketCode) {
            const code = encodeURIComponent(ticketCode.trim().toUpperCase());
            const response = await Api.get(`/api/tickets/code/${code}`, {}, { skip403Toast: true });
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(extractErrorMessage(errData, `Không tìm thấy phiếu khiếu nại với mã: ${ticketCode}`));
            }
            return response.json();
        },

        /**
         * Tra cứu các phiếu khiếu nại theo Mã vận đơn bưu chính WB...
         * @param {string} trackingCode
         */
        async getTicketsByTrackingCode(trackingCode) {
            const code = encodeURIComponent(trackingCode.trim().toUpperCase());
            const response = await Api.get(`/api/tickets?trackingCode=${code}`, {}, { skip403Toast: true });
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(extractErrorMessage(errData, `Không tìm thấy khiếu nại cho đơn ${trackingCode}`));
            }
            return response.json();
        },

        /**
         * Lấy chi tiết ticket theo ID
         * @param {number|string} id
         */
        async getTicketById(id) {
            const response = await Api.get(`/api/tickets/${id}`, {}, { skip403Toast: true });
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(extractErrorMessage(errData, `Không tìm thấy phiếu khiếu nại ID: ${id}`));
            }
            return response.json();
        },

        /**
         * Lấy toàn bộ danh sách phiếu khiếu nại trên hệ thống (Dành cho ROLE_CS, ROLE_ADMIN)
         * @param {string} status - (Tùy chọn: ALL, OPEN, IN_PROGRESS, RESOLVED, CLOSED)
         */
        async getAllTickets(status = null, trackingCode = null) {
            const params = new URLSearchParams();
            if (status && status !== 'ALL') params.append('status', status);
            if (trackingCode) params.append('trackingCode', trackingCode.trim().toUpperCase());
            const query = params.toString() ? `?${params.toString()}` : '';
            const response = await Api.get(`/api/tickets${query}`, {}, { skip403Toast: true });
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(extractErrorMessage(errData, 'Không thể tải danh sách tác nghiệp'));
            }
            return response.json();
        },

        /**
         * Nhân viên CSKH tiếp nhận xử lý phiếu
         * @param {number|string} id
         * @param {string} csName
         */
        async assignTicket(id, csName = 'Chuyên viên CSKH') {
            const response = await Api.put(`/api/tickets/${id}/assign?csName=${encodeURIComponent(csName)}`, {});
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(extractErrorMessage(errData, 'Tiếp nhận xử lý thất bại'));
            }
            return response.json();
        },

        /**
         * Chốt phương án giải quyết và duyệt số tiền bồi hoàn (VNĐ)
         * @param {number|string} id
         * @param {Object} payload: { compensationAmount, resolutionNote }
         */
        async resolveTicket(id, payload) {
            const response = await Api.put(`/api/tickets/${id}/resolve`, payload);
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(extractErrorMessage(errData, 'Duyệt phương án giải quyết thất bại'));
            }
            return response.json();
        },

        /**
         * Gửi thêm tin nhắn đối thoại vào phiếu khiếu nại (Chatbox)
         * @param {number|string} id
         * @param {Object} payload: { content, attachmentUrls }
         */
        async addMessage(id, payload) {
            const response = await Api.post(`/api/tickets/${id}/messages`, payload, {}, { skip403Toast: true });
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(extractErrorMessage(errData, 'Không thể gửi tin nhắn phản hồi'));
            }
            return response.json();
        }
    };

    window.SupportService = SupportService;
})();
