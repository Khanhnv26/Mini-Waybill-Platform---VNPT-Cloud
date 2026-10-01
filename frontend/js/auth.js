const PROFILE_PATCH_FIELDS = ['fullName', 'phoneNumber', 'address', 'avatarUrl', 'googleLinked', 'locationCode'];

function buildProfilePatch(data) {
    const patch = {};
    if (!data || typeof data !== 'object') return patch;
    PROFILE_PATCH_FIELDS.forEach(field => {
        const value = data[field];
        if (value !== undefined && value !== null && value !== '') {
            patch[field] = value;
        }
    });
    // Only overwrite authorization data when the server returns a non-empty
    // list; otherwise keep the roles/permissions stored at login.
    if (Array.isArray(data.roles) && data.roles.length > 0) patch.roles = data.roles;
    if (Array.isArray(data.permissions) && data.permissions.length > 0) patch.permissions = data.permissions;
    return patch;
}

const Auth = {
    setSession(token, user) {
        if (!token) return;
        localStorage.setItem('accessToken', token);
        if (user) {
            localStorage.setItem('user', JSON.stringify(user));
        }
        this.notifyChanged();
    },

    notifyChanged() {
        if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
            window.dispatchEvent(new CustomEvent('auth:changed'));
        }
    },

    getToken() {
        return localStorage.getItem('accessToken');
    },

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

    decodeJwtPayload() {
        const token = this.getToken();
        if (!token) return null;
        try {
            const parts = token.split('.');
            if (parts.length !== 3) return null;
            
            const base64Url = parts[1];
            let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            while (base64.length % 4) {
                base64 += '=';
            }
            
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

    isAuthenticated() {
        const token = this.getToken();
        if (!token) return false;
        
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

    getRoles() {
        const user = this.getUser();
        if (user && Array.isArray(user.roles) && user.roles.length > 0) {
            return user.roles;
        }
        const payload = this.decodeJwtPayload();
        if (payload && Array.isArray(payload.roles)) {
            return payload.roles;
        }
        return [];
    },

    normalizeRole(role) {
        if (!role) return '';
        const name = typeof role === 'string' ? role : (role.name || role.authority || '');
        const upper = String(name).trim().toUpperCase();
        return upper.startsWith('ROLE_') ? upper : `ROLE_${upper}`;
    },

    hasRole(roleName) {
        if (!roleName) return false;
        const target = this.normalizeRole(roleName);
        const roles = this.getRoles().map(r => this.normalizeRole(r));
        return roles.includes(target);
    },

    hasAnyRole(roleNames) {
        if (!Array.isArray(roleNames) || roleNames.length === 0) return false;
        return roleNames.some(role => this.hasRole(role));
    },

    getPermissions() {
        const user = this.getUser();
        if (user && Array.isArray(user.permissions) && user.permissions.length > 0) {
            return user.permissions;
        }
        const payload = this.decodeJwtPayload();
        if (payload && Array.isArray(payload.permissions)) {
            return payload.permissions;
        }
        return [];
    },

    getLocationCode() {
        const payload = this.decodeJwtPayload();
        if (payload) {
            const value = payload.locationCode;
            return value === null || value === undefined ? '' : String(value).trim();
        }

        // If the token cannot be decoded, do not trust localStorage for a
        // station scope. Backend authorization also fails closed in this case.
        return '';
    },

    hasPermission(permissionCode) {
        if (!permissionCode) return true;
        if (!this.isAuthenticated()) return false;
        if (this.hasRole('ROLE_ADMIN')) return true;

        const perms = this.getPermissions();
        return perms.includes(permissionCode);
    },

    hasAnyPermission(permissionCodes) {
        if (!Array.isArray(permissionCodes) || permissionCodes.length === 0) return true;
        if (!this.isAuthenticated()) return false;
        if (this.hasRole('ROLE_ADMIN')) return true;

        const perms = this.getPermissions();
        return permissionCodes.some(code => perms.includes(code));
    },

    clearSession() {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        this.notifyChanged();
    },

    logout() {
        this.clearSession();
        if (typeof window.navigateTo === 'function') {
            window.navigateTo('/login');
        } else {
            window.location.href = '/login';
        }
    },

    requireAuth() {
        if (!this.isAuthenticated()) {
            sessionStorage.setItem('redirectAfterLogin', window.location.pathname + window.location.search);
            if (typeof window.navigateTo === 'function') {
                window.navigateTo('/login');
            } else {
                window.location.href = '/login';
            }
            return false;
        }
        return true;
    },

    isInternalStaff() {
        if (!this.isAuthenticated()) return false;
        const staffRoles = [
            'ROLE_ADMIN',
            'ROLE_POST_OFFICE_STAFF',
            'ROLE_POST_OFFICE_OPERATOR',
            'ROLE_HUB_OPERATOR',
            'ROLE_SHIPPER',
            'ROLE_DISPATCHER',
            'ROLE_CS'
        ];
        return this.hasAnyRole(staffRoles);
    },

    isStaff() {
        return this.isInternalStaff();
    },

    isCustomer() {
        return this.isAuthenticated() && !this.isInternalStaff();
    },

    getRoleDisplayName(roleName) {
        if (!roleName) return 'Khách Hàng / Đối Tác';
        const role = this.normalizeRole(roleName);
        const map = {
            'ROLE_ADMIN': 'Quản Trị Hệ Thống (Admin)',
            'ROLE_POST_OFFICE_STAFF': 'Nhân Viên Bưu Cục Tiếp Nhận',
            'ROLE_POST_OFFICE_OPERATOR': 'Giao Dịch Viên Bưu Cục',
            'ROLE_HUB_OPERATOR': 'Điều Phối Viên Kho Hub',
            'ROLE_SHIPPER': 'Bưu Tá Giao Vận Chặng Cuối',
            'ROLE_DISPATCHER': 'Điều Phối Đội Xe Vận Tải',
            'ROLE_CS': 'Chăm Sóc Khách Hàng (CS)',
            'ROLE_CUSTOMER': 'Khách Hàng / Chủ Shop'
        };
        return map[role] || role.replace('ROLE_', '');
    },

    async getMyProfile() {
        if (typeof Api === 'undefined') {
            throw new Error('Api client chưa sẵn sàng');
        }
        const response = await Api.get('/api/auth/me');
        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.message || errData.error || 'Không thể tải thông tin hồ sơ tài khoản');
        }
        const data = await response.json();
        if (data) {
            const currentUser = this.getUser() || {};
            const patch = buildProfilePatch(data);
            const mergedUser = { ...currentUser, ...patch };
            this.setSession(this.getToken(), mergedUser);
        }
        return data;
    },

    async updateMyProfile(payload) {
        if (typeof Api === 'undefined') {
            throw new Error('Api client chưa sẵn sàng');
        }
        const response = await Api.put('/api/auth/me', payload);
        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.message || errData.error || 'Cập nhật hồ sơ thất bại');
        }
        const data = await response.json();
        if (data) {
            const currentUser = this.getUser() || {};
            const nextToken = data.accessToken || this.getToken();
            const patch = buildProfilePatch(data);
            const mergedUser = { ...currentUser, ...patch };
            this.setSession(nextToken, mergedUser);
        }
        return data;
    },

    async changePassword(payload) {
        if (typeof Api === 'undefined') {
            throw new Error('Api client chưa sẵn sàng');
        }
        const response = await Api.put('/api/auth/change-password', payload);
        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.message || errData.error || 'Đổi mật khẩu thất bại');
        }
        return response.json();
    }
};

window.Auth = Auth;
