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
        }
    };

    window.PaymentService = PaymentService;
})();
