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
        rememberTicketAccess(ticket) {
            if (!ticket?.accessToken) return;
            for (const key of [ticket.id, ticket.ticketCode]) {
                if (key != null) sessionStorage.setItem(`support_access:${key}`, ticket.accessToken);
            }
        },

        setTicketAccess(code, token) {
            if (code && token) sessionStorage.setItem(`support_access:${code.trim().toUpperCase()}`, token.trim());
        },

        getTicketAccess(ticket) {
            const keys = typeof ticket === 'object' ? [ticket?.id, ticket?.ticketCode] : [ticket];
            for (const key of keys) {
                const value = key == null ? null : sessionStorage.getItem(`support_access:${key}`);
                if (value) return value;
            }
            return null;
        },

        ticketHeaders(ticket) {
            const token = this.getTicketAccess(ticket);
            return token ? { 'X-Ticket-Access-Token': token } : {};
        },

        async readTicket(response) {
            const ticket = await response.json();
            const token = this.getTicketAccess(ticket);
            if (token) ticket.accessToken = token;
            this.rememberTicketAccess(ticket);
            return ticket;
        },

        async createTicket(payload) {
            const response = await Api.post('/api/tickets', payload, {}, { skip403Toast: true });
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(extractErrorMessage(errData, 'Không thể tạo phiếu khiếu nại'));
            }
            const ticket = await response.json();
            this.rememberTicketAccess(ticket);
            return ticket;
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
            const response = await Api.get(`/api/tickets/code/${code}`, this.ticketHeaders(ticketCode.trim().toUpperCase()), { skip403Toast: true, silent: true });
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(extractErrorMessage(errData, `Không tìm thấy phiếu khiếu nại với mã: ${ticketCode}`));
            }
            return this.readTicket(response);
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
            const response = await Api.get(`/api/tickets/${id}`, this.ticketHeaders(id), { skip403Toast: true, silent: true });
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(extractErrorMessage(errData, `Không tìm thấy phiếu khiếu nại ID: ${id}`));
            }
            return this.readTicket(response);
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
            const response = await Api.post(`/api/tickets/${id}/messages`, payload, this.ticketHeaders(id), { skip403Toast: true });
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(extractErrorMessage(errData, 'Không thể gửi tin nhắn phản hồi'));
            }
            return response.json();
        },

        async uploadAttachment(file, ticketId) {
            if (!ticketId) throw new Error('Vui lòng mở phiếu hỗ trợ trước khi tải tệp');
            const formData = new FormData();
            formData.append('file', file);
            formData.append('ticketId', ticketId);
            const response = await Api.upload('/api/tickets/upload', formData, this.ticketHeaders(ticketId), { skip403Toast: true });
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(extractErrorMessage(errData, 'Không thể tải ảnh lên máy chủ lưu trữ MinIO'));
            }
            return response.json();
        }
    };

    class SupportChatConnection {
        constructor({ url, onConnect, onDisconnect, onMessage }) {
            this.url = url;
            this.onConnect = onConnect;
            this.onDisconnect = onDisconnect;
            this.onMessage = onMessage;
            this.attempt = 0;
            this.stopped = false;
            this.ticket = null;
        }

        start() {
            if (this.stopped || this.connecting || this.client?.connected) return;
            if (typeof SockJS === 'undefined' || typeof Stomp === 'undefined') {
                this.retry();
                return;
            }
            this.connecting = true;
            const socket = new SockJS(this.url, null, { timeout: 8000 });
            const client = Stomp.over(socket);
            this.socket = socket;
            this.client = client;
            client.debug = null;
            client.heartbeat.outgoing = 10000;
            client.heartbeat.incoming = 10000;
            const token = typeof Auth !== 'undefined' ? Auth.getToken() : null;
            client.connect(token ? { Authorization: `Bearer ${token}` } : {}, () => {
                if (this.stopped || this.client !== client) { client.disconnect(); return; }
                this.connecting = false;
                this.attempt = 0;
                this.subscribe(this.ticket);
                this.onConnect();
            }, () => {
                if (this.stopped || this.client !== client) return;
                this.connecting = false;
                this.client = null;
                this.onDisconnect();
                try { socket.close(); } catch {}
                this.retry();
            });
        }

        retry() {
            if (this.stopped || this.retryTimer) return;
            const delay = Math.min(30000, 1000 * 2 ** Math.min(this.attempt++, 5));
            this.retryTimer = setTimeout(() => { this.retryTimer = null; this.start(); }, delay);
        }

        subscribe(ticket) {
            this.ticket = ticket;
            if (this.subscription) { this.subscription.unsubscribe(); this.subscription = null; }
            if (!ticket || !this.client?.connected) return;
            const destination = ticket.id ? `/topic/tickets/${ticket.id}` : `/topic/tickets/code/${ticket.ticketCode}`;
            this.subscription = this.client.subscribe(destination, this.onMessage, SupportService.ticketHeaders(ticket));
        }

        stop() {
            this.stopped = true;
            clearTimeout(this.retryTimer);
            if (this.subscription) { try { this.subscription.unsubscribe(); } catch {} }
            if (this.client) { try { this.client.disconnect(); } catch {} }
            if (this.socket) { try { this.socket.close(); } catch {} }
            this.client = null;
        }
    }

    window.SupportChatConnection = SupportChatConnection;
    window.SupportService = SupportService;
})();
