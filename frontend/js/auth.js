/**
 * ==============================================================================
 * VNPT WAYBILL PLATFORM - AUTH & RBAC SECURITY MODULE
 * Quản lý Phiên Đăng Nhập, Giải Mã JWT Token & Động Cơ Kiểm Soát Quyền Hạn (RBAC)
 * ==============================================================================
 */

const Auth = {
    // 1. Lưu phiên đăng nhập (Token + User Object)
    setSession(token, user) {
        if (!token) return;
        localStorage.setItem('accessToken', token);
        if (user) {
            localStorage.setItem('user', JSON.stringify(user));
        }
    },

    // 2. Lấy Access Token hiện tại
    getToken() {
        return localStorage.getItem('accessToken');
    },

    // 3. Lấy thông tin User hiện tại từ localStorage
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

    // 4. Giải mã Payload của JWT Token (Base64Url -> JSON Claims)
    // Giúp Frontend chủ động trích xuất roles, permissions mà không cần phụ thuộc hoàn toàn vào Backend API
    decodeJwtPayload() {
        const token = this.getToken();
        if (!token) return null;
        try {
            const parts = token.split('.');
            if (parts.length !== 3) return null;
            
            // Xử lý Base64Url sang Base64 chuẩn kèm padding an toàn
            const base64Url = parts[1];
            let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            while (base64.length % 4) {
                base64 += '=';
            }
            
            // Hỗ trợ tiếng Việt UTF-8 chuẩn xác
            const jsonPayload = decodeURIComponent(
                atob(base64)
                    .split('')
                    .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                    .join('')
            );
            return JSON.parse(jsonPayload);
        } catch (err) {
            console.warn('[Auth] Không thể giải mã JWT payload:', err);
            return null;
        }
    },

    // 5. Kiểm tra người dùng đã đăng nhập hợp lệ hay chưa
    isAuthenticated() {
        const token = this.getToken();
        if (!token) return false;
        
        // Kiểm tra xem token còn hạn (exp) không
        const payload = this.decodeJwtPayload();
        if (payload && payload.exp) {
            const nowSeconds = Math.floor(Date.now() / 1000);
            if (payload.exp < nowSeconds) {
                console.warn('[Auth] Phiên làm việc (JWT) đã hết hạn!');
                this.clearSession();
                return false;
            }
        }
        return true;
    },

    // 6. Lấy danh sách Roles của người dùng
    getRoles() {
        const user = this.getUser();
        if (user && Array.isArray(user.roles) && user.roles.length > 0) {
            return user.roles;
        }
        // Fallback đọc từ claims của JWT Token
        const payload = this.decodeJwtPayload();
        if (payload && Array.isArray(payload.roles)) {
            return payload.roles;
        }
        return [];
    },

    // 7. Kiểm tra xem người dùng có Role cụ thể hay không
    // Ví dụ: Auth.hasRole('ROLE_ADMIN')
    hasRole(roleName) {
        if (!roleName) return false;
        const roles = this.getRoles();
        return roles.includes(roleName);
    },

    // 8. Kiểm tra xem người dùng có ít nhất một trong các Roles
    // Ví dụ: Auth.hasAnyRole(['ROLE_ADMIN', 'ROLE_CS'])
    hasAnyRole(roleNames) {
        if (!Array.isArray(roleNames) || roleNames.length === 0) return false;
        const roles = this.getRoles();
        return roleNames.some(role => roles.includes(role));
    },

    // 9. Lấy danh sách Quyền Hạn Chi Tiết (Granular Permissions)
    // Ví dụ: ['shipment:create', 'shipment:read_all', 'user:read', ...]
    getPermissions() {
        const user = this.getUser();
        if (user && Array.isArray(user.permissions) && user.permissions.length > 0) {
            return user.permissions;
        }
        // Fallback trích xuất trực tiếp từ claim 'permissions' trong JWT
        const payload = this.decodeJwtPayload();
        if (payload && Array.isArray(payload.permissions)) {
            return payload.permissions;
        }
        return [];
    },

    // 10. Kiểm tra quyền chi tiết (Permission-Based Access Control)
    // Ví dụ: Auth.hasPermission('shipment:create')
    // NOTE: ROLE_ADMIN luôn có toàn quyền tối thượng
    hasPermission(permissionCode) {
        if (!permissionCode) return true; // Hành động public
        if (!this.isAuthenticated()) return false;
        if (this.hasRole('ROLE_ADMIN')) return true; // Super Admin bypass

        const perms = this.getPermissions();
        return perms.includes(permissionCode);
    },

    // 11. Kiểm tra xem người dùng có ít nhất một trong danh sách Permissions
    hasAnyPermission(permissionCodes) {
        if (!Array.isArray(permissionCodes) || permissionCodes.length === 0) return true;
        if (!this.isAuthenticated()) return false;
        if (this.hasRole('ROLE_ADMIN')) return true;

        const perms = this.getPermissions();
        return permissionCodes.some(code => perms.includes(code));
    },

    // 12. Xóa sạch phiên làm việc
    clearSession() {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
    },

    // 13. Đăng xuất khỏi hệ thống
    logout() {
        this.clearSession();
        window.location.href = 'login.html';
    },

    // 14. Route Guard: Bảo vệ trang yêu cầu đăng nhập
    requireAuth() {
        if (!this.isAuthenticated()) {
            sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
            window.location.href = 'login.html';
            return false;
        }
        return true;
    }
};

window.Auth = Auth;
