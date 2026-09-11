/**
 * VNPT CLOUD - CUSTOMER SERVICE CLIENT
 * Quản lý danh bạ khách hàng bưu chính doanh nghiệp
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

    const CustomerService = {
        async getAllCustomers() {
            const response = await Api.get('/api/customers');
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(extractErrorMessage(errData, 'Không thể tải danh bạ khách hàng'));
            }
            return response.json();
        },

        async createCustomer(payload) {
            const response = await Api.post('/api/customers', payload);
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(extractErrorMessage(errData, 'Thêm khách hàng thất bại'));
            }
            return response.json();
        },

        async updateCustomerStatus(id, status, customer = null) {
            const payload = customer ? {
                fullName: customer.fullName,
                address: customer.address || 'N/A',
                email: customer.email,
                phoneNumber: customer.phoneNumber,
                status
            } : { status };
            const response = await Api.put(`/api/customers/${id}`, payload);
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(extractErrorMessage(errData, 'Cập nhật trạng thái khách hàng thất bại'));
            }
            return response.json();
        },

        async getMyProfile() {
            const response = await Api.get('/api/customers/me');
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(extractErrorMessage(errData, 'Không thể tải thông tin hồ sơ'));
            }
            return response.json();
        },

        async updateMyProfile(payload) {
            const response = await Api.put('/api/customers/me', payload);
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(extractErrorMessage(errData, 'Cập nhật hồ sơ thất bại'));
            }
            return response.json();
        }
    };

    window.CustomerService = CustomerService;
})();
