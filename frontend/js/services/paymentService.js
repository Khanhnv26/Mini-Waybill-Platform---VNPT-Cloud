(function () {
    const PaymentService = {
        async createQrPayment(payload) {
            const response = await Api.post('/api/payments/create-qr', payload);
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || errData.message || 'Không thể tạo mã VietQR thanh toán');
            }
            return response.json();
        },
        async getPayment(paymentCode) {
            const response = await Api.get(`/api/payments/${paymentCode}`);
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || errData.message || 'Không tìm thấy giao dịch');
            }
            return response.json();
        },
        async getPaymentByTracking(trackingCode) {
            const response = await Api.get(`/api/payments/tracking/${trackingCode}`);
            if (!response.ok) {
                return null;
            }
            return response.json();
        },
        async getPaidTrackingCodes() {
            const response = await Api.get('/api/payments/paid-codes', {}, { silent: true });
            if (!response.ok) {
                return [];
            }
            return response.json();
        },
        async mockPay(trackingCode) {
            const response = await Api.post(`/api/payments/mock-pay/${trackingCode}`, {});
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || errData.message || 'Thanh toán giả lập thất bại');
            }
            return response.json();
        },
        async getTransactions(params = {}) {
            const query = new URLSearchParams();
            if (params.page !== undefined && params.page !== null) query.append('page', params.page);
            if (params.size !== undefined && params.size !== null) query.append('size', params.size);
            if (params.keyword) query.append('keyword', params.keyword);
            if (params.status) query.append('status', params.status);
            if (params.paymentType) query.append('paymentType', params.paymentType);
            if (params.paymentMethod) query.append('paymentMethod', params.paymentMethod);
            if (params.customerCode) query.append('customerCode', params.customerCode);
            if (params.fromDate) query.append('fromDate', params.fromDate);
            if (params.toDate) query.append('toDate', params.toDate);
            const qs = query.toString();
            const endpoint = `/api/payments${qs ? '?' + qs : ''}`;
            const response = await Api.get(endpoint);
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                const detailMsg = (errData.errors && Object.values(errData.errors).join(', ')) || errData.error || errData.message;
                throw new Error(detailMsg || 'Không thể tải danh sách giao dịch');
            }
            return response.json();
        },
        async getStats(customerCode = null) {
            let endpoint = '/api/payments/stats';
            if (customerCode) {
                endpoint += `?customerCode=${encodeURIComponent(customerCode)}`;
            }
            const response = await Api.get(endpoint);
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || errData.message || 'Không thể tải thống kê thanh toán');
            }
            return response.json();
        },
        async confirmCashPayment(payload) {
            const response = await Api.post('/api/payments/confirm-cash', payload);
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || errData.message || 'Không thể xác nhận thu tiền mặt');
            }
            return response.json();
        }
    };
    window.PaymentService = PaymentService;
})();
