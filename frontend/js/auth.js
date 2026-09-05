/**
 * VNPT Waybill Platform - Auth Module
 * Quản lý Token, Thông tin người dùng & Phân quyền RBAC trên Frontend
 */
const Auth = {
    // 1. Lưu phiên đăng nhập (Token + User Object)
    setSession(token, user) {
        if (!token) return;
        localStorage.setItem('accessToken', token);
        localStorage.setItem('user', JSON.stringify(user || {}));
    },

    // 2. Lấy Access Token
    getToken() {
        return localStorage.getItem('accessToken');
    },

    // 3. Lấy thông tin User hiện tại
    getUser() {
        const userStr = localStorage.getItem('user');
        if (!userStr) return null;
        try {
            return JSON.parse(userStr);
        } catch (e) {
            this.clearSession();
            return null;
        }
    },

    // 4. Kiểm tra xem người dùng đã đăng nhập chưa
    isAuthenticated() {
        const token = this.getToken();
        const user = this.getUser();
        return !!(token && user);
    },

    // 5. Kiểm tra quyền RBAC (Role-Based Access Control)
    // Ví dụ: Auth.hasRole('ROLE_ADMIN') hoặc Auth.hasRole('ROLE_CUSTOMER')
    hasRole(roleName) {
        const user = this.getUser();
        if (!user || !user.roles || !Array.isArray(user.roles)) {
            return false;
        }
        return user.roles.includes(roleName);
    },

    // 6. Kiểm tra xem có ít nhất một trong các quyền trong danh sách không
    // Ví dụ: Auth.hasAnyRole(['ROLE_ADMIN', 'ROLE_SHIPPER'])
    hasAnyRole(roleNames) {
        if (!Array.isArray(roleNames)) return false;
        return roleNames.some(role => this.hasRole(role));
    },

    // 7. Xóa sạch phiên làm việc
    clearSession() {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
    },

    // 8. Đăng xuất và chuyển hướng về trang Login
    logout() {
        this.clearSession();
        window.location.href = '/login.html';
    },

    // 9. Route Guard: Bảo vệ trang yêu cầu đăng nhập
    requireAuth() {
        if (!this.isAuthenticated()) {
            // Lưu lại trang hiện tại để sau khi login có thể quay lại
            sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
            window.location.href = '/login.html';
            return false;
        }
        return true;
    }
};

window.Auth = Auth;
