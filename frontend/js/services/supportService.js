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
        async createTicket(payload) {
            const response = await Api.post('/api/tickets', payload, {}, { skip403Toast: true });
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(extractErrorMessage(errData, 'Không thể tạo phiếu khiếu nại'));
            }
            return response.json();
        },

        async getMyTickets() {
            const response = await Api.get('/api/tickets/my-tickets', {}, { skip403Toast: true, silent: true });
            if (!response.ok) {
                return [];
            }
            return response.json();
        },

        async getTicketByCode(ticketCode) {
            const code = encodeURIComponent(ticketCode.trim().toUpperCase());
            const response = await Api.get(`/api/tickets/code/${code}`, {}, { skip403Toast: true });
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(extractErrorMessage(errData, `Không tìm thấy phiếu khiếu nại với mã: ${ticketCode}`));
            }
            return response.json();
        },

        async getTicketsByTrackingCode(trackingCode) {
            const code = encodeURIComponent(trackingCode.trim().toUpperCase());
            const response = await Api.get(`/api/tickets?trackingCode=${code}`, {}, { skip403Toast: true });
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(extractErrorMessage(errData, `Không tìm thấy khiếu nại cho đơn ${trackingCode}`));
            }
            return response.json();
        },

        async getTicketById(id) {
            const response = await Api.get(`/api/tickets/${id}`, {}, { skip403Toast: true });
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(extractErrorMessage(errData, `Không tìm thấy phiếu khiếu nại ID: ${id}`));
            }
            return response.json();
        },

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

        async assignTicket(id, csName = 'Chuyên viên CSKH') {
            const response = await Api.put(`/api/tickets/${id}/assign?csName=${encodeURIComponent(csName)}`, {});
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(extractErrorMessage(errData, 'Tiếp nhận xử lý thất bại'));
            }
            return response.json();
        },

        async resolveTicket(id, payload) {
            const response = await Api.put(`/api/tickets/${id}/resolve`, payload);
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(extractErrorMessage(errData, 'Duyệt phương án giải quyết thất bại'));
            }
            return response.json();
        },

        async addMessage(id, payload) {
            const response = await Api.post(`/api/tickets/${id}/messages`, payload, {}, { skip403Toast: true });
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(extractErrorMessage(errData, 'Không thể gửi tin nhắn phản hồi'));
            }
            return response.json();
        },

        async uploadAttachment(file) {
            const formData = new FormData();
            formData.append('file', file);
            const response = await Api.upload('/api/tickets/upload', formData, {}, { skip403Toast: true });
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(extractErrorMessage(errData, 'Không thể tải ảnh lên máy chủ lưu trữ MinIO'));
            }
            return response.json();
        }
    };

    window.SupportService = SupportService;
})();
