/**
 * ==============================================================================
 * VNPT CLOUD - SERVICE: QUẢN TRỊ PHÂN QUYỀN (RBAC ADMIN SERVICE)
 * Gọi trực tiếp các API Quản trị Hệ thống: Permissions, Roles & User Management
 * 100% NẠP DỮ LIỆU THẬT TỪ BACKEND - KHÔNG DÙNG DỮ LIỆU MOCK / FALLBACK
 * ==============================================================================
 */

(function () {
    const AdminService = {
        /**
         * 1. Lấy danh bạ toàn bộ quyền (Permissions) trong hệ thống
         */
        async getAllPermissions() {
            const res = await Api.get('/api/admin/permissions');
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || `Không thể nạp danh mục quyền hạn (HTTP ${res.status})`);
            }
            return await res.json();
        },

        /**
         * 2. Lấy danh sách Roles kèm Permissions hiện tại
         */
        async getAllRoles() {
            const res = await Api.get('/api/admin/roles');
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || `Không thể nạp danh sách vai trò (HTTP ${res.status})`);
            }
            return await res.json();
        },

        /**
         * 3. Cập nhật phân quyền cho một Role cụ thể
         * @param {number} roleId
         * @param {string[]} permissionCodes
         */
        async updateRolePermissions(roleId, permissionCodes) {
            const res = await Api.put(`/api/admin/roles/${roleId}/permissions`, {
                permissionCodes
            });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || `Cập nhật phân quyền thất bại (HTTP ${res.status})`);
            }
            return await res.json();
        },

        /**
         * 4. Lấy danh sách người dùng trong hệ thống từ CSDL
         */
        async getAllUsers() {
            const res = await Api.get('/api/admin/users');
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || `Không thể tải danh sách người dùng từ cơ sở dữ liệu (HTTP ${res.status})`);
            }
            return await res.json();
        },

        /**
         * 5. Gán vai trò mới cho tài khoản người dùng
         * @param {number} userId
         * @param {string[]} roleNames
         */
        async updateUserRoles(userId, roleNames) {
            const res = await Api.put(`/api/admin/users/${userId}/roles`, {
                roleNames
            });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || `Cập nhật vai trò thất bại (HTTP ${res.status})`);
            }
            return await res.json();
        },

        /**
         * 6. Khóa hoặc Kích hoạt tài khoản người dùng
         * @param {number} userId
         * @param {string} status - 'ACTIVE' | 'BLOCKED'
         */
        async updateUserStatus(userId, status) {
            const res = await Api.put(`/api/admin/users/${userId}/status`, {
                status
            });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || `Cập nhật trạng thái người dùng thất bại (HTTP ${res.status})`);
            }
            return await res.json();
        }
    };

    window.AdminService = AdminService;
})();
