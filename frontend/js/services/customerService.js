/**
 * VNPT CLOUD - CUSTOMER SERVICE CLIENT
 * Quản lý danh bạ khách hàng bưu chính doanh nghiệp
 */

(function () {
    const CustomerService = {
        async getAllCustomers() {
            const response = await Api.get('/api/customers');
            if (!response.ok) {
                throw new Error('Không thể tải danh bạ khách hàng');
            }
            return response.json();
        },

        async createCustomer(payload) {
            const response = await Api.post('/api/customers', payload);
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.message || 'Thêm khách hàng thất bại');
            }
            return response.json();
        }
    };

    window.CustomerService = CustomerService;
})();
