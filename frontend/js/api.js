/**
 * ==============================================================================
 * VNPT WAYBILL PLATFORM - UNIFIED API CLIENT
 * Tự Động Đính Kèm JWT Bearer Token, Xử Lý Lỗi Toàn Cục & 403 Interceptor
 * ==============================================================================
 */

const API_BASE_URL = window.location.port === '3000' ? '' : 'http://localhost:8080';

const Api = {
    /**
     * Hàm gọi API chung
     * @param {string} endpoint - Ví dụ: '/api/shipments', '/api/admin/roles'
     * @param {object} options - Cấu hình fetch (method, headers, body...)
     */
    async request(endpoint, options = {}) {
        const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
        
        const headers = {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        };

        // 1. Tự động đính kèm Token JWT nếu người dùng đã đăng nhập
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

            // 2. HTTP 401 Unauthorized: Phiên làm việc hết hạn hoặc Token không hợp lệ
            if (response.status === 401) {
                console.warn('[API 401] Token không hợp lệ hoặc đã hết hạn.');
                if (typeof Auth !== 'undefined') {
                    Auth.clearSession();
                }
                
                // Tránh loop nếu đang ở trang login
                if (!window.location.pathname.includes('login.html')) {
                    if (window.Utils && window.Utils.showToast) {
                        window.Utils.showToast('Hết Hạn Phiên (401)', 'Phiên làm việc đã hết hạn. Đang chuyển về trang đăng nhập...', 'warning');
                    }
                    setTimeout(() => {
                        window.location.href = 'login.html';
                    }, 1500);
                }
                return response;
            }

            // 3. HTTP 403 Forbidden: Bị từ chối bởi cơ chế phân quyền RBAC
            if (response.status === 403) {
                console.warn('[API 403] Truy cập bị từ chối do không đủ quyền hạn RBAC.');
                if (window.Utils && window.Utils.showToast) {
                    window.Utils.showToast(
                        'Truy Cập Bị Từ Chối (403)', 
                        'Tài khoản của bạn không có quyền thực hiện chức năng này!', 
                        'error'
                    );
                } else {
                    alert('Quyền truy cập bị từ chối: Bạn không có quyền thực hiện thao tác này!');
                }
                return response;
            }

            // 4. HTTP 429 Too Many Requests: Bị giới hạn tần suất yêu cầu (Rate Limiting)
            if (response.status === 429) {
                console.warn('[API 429] Vượt quá giới hạn tần suất yêu cầu (Rate Limiting).');
                const retryAfter = response.headers.get('Retry-After') || 'vài';
                if (window.Utils && window.Utils.showToast) {
                    window.Utils.showToast(
                        'Thao Tác Quá Nhanh (429)', 
                        `Bạn đã gửi quá nhiều yêu cầu liên tiếp. Vui lòng chờ ${retryAfter} giây rồi thử lại!`, 
                        'warning'
                    );
                }
                return response;
            }

            return response;
        } catch (error) {
            console.error('[API Network Error]:', error);
            if (window.Utils && window.Utils.showToast) {
                window.Utils.showToast('Lỗi Kết Nối', 'Không thể kết nối đến máy chủ Gateway (8080)', 'error');
            }
            throw error;
        }
    },

    async parseError(response, fallbackMessage = 'Yêu cầu không thành công') {
        let payload = null;

        // Đọc từ bản sao trước để không làm mất body của Response gốc khi cần dùng tiếp.
        const readBody = async (candidate) => {
            if (!candidate) return null;
            if (typeof candidate.text === 'function') {
                try {
                    const raw = await candidate.text();
                    if (raw === undefined || raw === null || raw === '') return null;
                    try {
                        return JSON.parse(raw);
                    } catch (e) {
                        return raw;
                    }
                } catch (e) {
                    return null;
                }
            }
            if (typeof candidate.json === 'function') {
                try {
                    return await candidate.json();
                } catch (e) {
                    return null;
                }
            }
            return null;
        };

        if (response) {
            let candidate = response;
            if (typeof response.clone === 'function') {
                try {
                    candidate = response.clone();
                } catch (e) {
                    candidate = response;
                }
            }
            payload = await readBody(candidate);

            // Một số mock Response chỉ hỗ trợ json(), không hỗ trợ text()/clone().
            if (payload === null && candidate !== response) {
                payload = await readBody(response);
            }
        }

        if (payload === null || payload === undefined) {
            payload = {};
        }

        const body = payload && typeof payload === 'object' ? payload : {};
        const nestedError = body.error && typeof body.error === 'object' ? body.error : {};
        const message = body.message
            || (typeof body.error === 'string' ? body.error : null)
            || nestedError.message
            || body.detail
            || body.title
            || (typeof payload === 'string' ? payload : null)
            || fallbackMessage;
        const error = new Error(String(message));
        error.status = response?.status ?? body.status ?? null;
        error.code = body.errorCode
            ?? body.code
            ?? nestedError.errorCode
            ?? nestedError.code
            ?? body.statusCode
            ?? null;
        error.details = payload;
        return error;
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

    patch(endpoint, body, headers = {}) {
        return this.request(endpoint, {
            method: 'PATCH',
            body: typeof body === 'string' ? body : JSON.stringify(body),
            headers
        });
    },

    delete(endpoint, headers = {}) {
        return this.request(endpoint, { method: 'DELETE', headers });
    }
};

window.Api = Api;
