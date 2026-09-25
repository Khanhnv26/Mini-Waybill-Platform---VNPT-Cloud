(function () {
    const AdminService = {
        async getAllPermissions() {
            const res = await Api.get('/api/admin/permissions');
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || `Không thể nạp danh mục quyền hạn (HTTP ${res.status})`);
            }
            return await res.json();
        },

        async getAllRoles() {
            const res = await Api.get('/api/admin/roles');
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || `Không thể nạp danh sách vai trò (HTTP ${res.status})`);
            }
            return await res.json();
        },

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

        async getAllUsers() {
            const res = await Api.get('/api/admin/users');
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || `Không thể tải danh sách người dùng từ cơ sở dữ liệu (HTTP ${res.status})`);
            }
            return await res.json();
        },

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

        async updateUserStatus(userId, status) {
            const res = await Api.put(`/api/admin/users/${userId}/status`, {
                status
            });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || `Cập nhật trạng thái người dùng thất bại (HTTP ${res.status})`);
            }
            return await res.json();
        },

        async updateUserLocation(userId, locationCode) {
            const res = await Api.put(`/api/admin/users/${userId}/location`, {
                locationCode: locationCode || null
            });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || `Cập nhật trạm tác nghiệp thất bại (HTTP ${res.status})`);
            }
            return await res.json();
        }
    };

    window.AdminService = AdminService;
})();
