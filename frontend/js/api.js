/**
 * VNPT Waybill Platform - API Client Module
 * Tự động gắn Token xác thực, xử lý lỗi toàn cục (401, 403)
 */
const API_BASE_URL = window.location.port === '3000' ? '' : 'http://localhost:8080';

const Api = {
    /**
     * Hàm gọi API chung
     * @param {string} endpoint - Ví dụ: '/api/shipments', '/api/auth/google'
     * @param {object} options - Cấu hình fetch (method, headers, body...)
     */
    async request(endpoint, options = {}) {
        const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
        
        const headers = {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        };

        // Tự động đính kèm Token JWT nếu đã đăng nhập
        if (typeof Auth !== 'undefined') {
            const token = Auth.getToken();
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
        }

        try {
            const response = await fetch(url, {
                ...options,
                headers
            });

            // 401 Unauthorized: Token hết hạn hoặc không hợp lệ
            if (response.status === 401) {
                console.warn('[API 401] Token không hợp lệ hoặc đã hết hạn.');
                if (typeof Auth !== 'undefined') {
                    Auth.clearSession();
                }
                // Chỉ đá về login nếu không phải đang ở trang login
                if (!window.location.pathname.includes('login.html')) {
                    alert('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!');
                    window.location.href = '/login.html';
                }
                return response;
            }

            // 403 Forbidden: Người dùng không có quyền (RBAC từ chối)
            if (response.status === 403) {
                console.warn('[API 403] Truy cập bị từ chối do không đủ quyền hạn RBAC.');
                alert('Quyền truy cập bị từ chối: Tài khoản của bạn không có quyền thực hiện chức năng này!');
                return response;
            }

            return response;
        } catch (error) {
            console.error('[API Network Error]:', error);
            throw error;
        }
    },

    get(endpoint, headers = {}) {
        return this.request(endpoint, { method: 'GET', headers });
    },

    post(endpoint, body, headers = {}) {
        return this.request(endpoint, {
            method: 'POST',
            body: typeof body === 'string' ? body : JSON.stringify(body),
            headers
        });
    },

    put(endpoint, body, headers = {}) {
        return this.request(endpoint, {
            method: 'PUT',
            body: typeof body === 'string' ? body : JSON.stringify(body),
            headers
        });
    },

    delete(endpoint, headers = {}) {
        return this.request(endpoint, { method: 'DELETE', headers });
    }
};

window.Api = Api;
