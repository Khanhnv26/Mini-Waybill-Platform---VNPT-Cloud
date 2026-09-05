/**
 * ==============================================================================
 * VNPT CLOUD - SERVICE: QUẢN TRỊ PHÂN QUYỀN (RBAC ADMIN SERVICE)
 * Gọi các API Quản trị Hệ thống: Permissions, Roles & User Role Assignment
 * ==============================================================================
 */

(function () {
    // 15 Permissions chuẩn đã seed trong SQL Server auth_db
    const FALLBACK_PERMISSIONS = [
        { id: 1, code: 'profile:read', name: 'Xem thông tin cá nhân', module: 'USER', description: 'Cho phép xem thông tin tài khoản đang đăng nhập' },
        { id: 2, code: 'profile:update', name: 'Cập nhật hồ sơ cá nhân', module: 'USER', description: 'Cho phép đổi họ tên, số điện thoại, avatar' },
        { id: 3, code: 'password:change', name: 'Đổi mật khẩu tài khoản', module: 'USER', description: 'Cho phép thay đổi mật khẩu đăng nhập' },
        { id: 4, code: 'shipment:create', name: 'Tạo mới đơn bưu gửi', module: 'SHIPMENT', description: 'Khởi tạo vận đơn bưu gửi bưu chính mới' },
        { id: 5, code: 'shipment:read_own', name: 'Xem đơn của chính mình', module: 'SHIPMENT', description: 'Tra cứu danh sách các đơn hàng do mình tạo ra' },
        { id: 6, code: 'shipment:read_all', name: 'Xem toàn bộ đơn hàng', module: 'SHIPMENT', description: 'Quyền xem toàn bộ vận đơn trên toàn hệ thống' },
        { id: 7, code: 'tracking:read_public', name: 'Tra cứu hành trình công khai', module: 'TRACKING', description: 'Tra cứu lộ trình qua mã vận đơn (cho khách)' },
        { id: 8, code: 'tracking:read_full', name: 'Tra cứu hành trình chuyên sâu', module: 'TRACKING', description: 'Xem chi tiết các mốc quét barcode bưu cục' },
        { id: 9, code: 'tracking:update_hub', name: 'Quét mã nhập/xuất bưu cục', module: 'TRACKING', description: 'Thủ kho cập nhật trạng thái luân chuyển hàng' },
        { id: 10, code: 'tracking:update_delivery', name: 'Cập nhật phát hàng', module: 'TRACKING', description: 'Bưu tá cập nhật trạng thái giao phát cho người nhận' },
        { id: 11, code: 'audit:read', name: 'Xem nhật ký kiểm toán tác nghiệp', module: 'AUDIT', description: 'Xem lịch sử thay đổi trạng thái bưu gửi kỹ thuật' },
        { id: 12, code: 'user:read', name: 'Xem danh bạ người dùng', module: 'USER', description: 'Xem danh sách tài khoản trong hệ thống' },
        { id: 13, code: 'user:update_status', name: 'Khóa/Kích hoạt tài khoản', module: 'USER', description: 'Đổi trạng thái tài khoản người dùng' },
        { id: 14, code: 'user:assign_role', name: 'Phân vai trò người dùng', module: 'USER', description: 'Gán vai trò (Roles) cho tài khoản' },
        { id: 15, code: 'routing:manage', name: 'Quản lý bưu cục & tuyến đường', module: 'ROUTING', description: 'Thêm/sửa cấu hình Hubs và Route vận chuyển' }
    ];

    const FALLBACK_ROLES = [
        {
            id: 1,
            name: 'ROLE_ADMIN',
            description: 'Quản trị viên tối cao hệ thống VNPT',
            permissions: FALLBACK_PERMISSIONS.map(p => p.code)
        },
        {
            id: 2,
            name: 'ROLE_CS',
            description: 'Nhân viên Chăm sóc khách hàng & Điều hành bưu gửi',
            permissions: ['profile:read', 'profile:update', 'password:change', 'shipment:read_all', 'tracking:read_public', 'tracking:read_full', 'audit:read', 'user:read']
        },
        {
            id: 3,
            name: 'ROLE_HUB_OPERATOR',
            description: 'Thủ kho vận hành bưu cục trung chuyển / Hub bưu chính',
            permissions: ['profile:read', 'password:change', 'tracking:read_public', 'tracking:read_full', 'tracking:update_hub']
        },
        {
            id: 4,
            name: 'ROLE_SHIPPER',
            description: 'Bưu tá giao hàng chặng cuối (Last-mile delivery)',
            permissions: ['profile:read', 'password:change', 'tracking:read_public', 'tracking:read_full', 'tracking:update_delivery']
        },
        {
            id: 5,
            name: 'ROLE_CUSTOMER',
            description: 'Khách hàng cá nhân & Doanh nghiệp gửi hàng',
            permissions: ['profile:read', 'profile:update', 'password:change', 'shipment:create', 'shipment:read_own', 'tracking:read_public']
        }
    ];

    const FALLBACK_USERS = [
        {
            id: 1,
            email: 'admin@waybill.vn',
            fullName: 'Tổng Giám Thị Quản Trị Hệ Thống',
            status: 'ACTIVE',
            roles: ['ROLE_ADMIN'],
            createdAt: '2026-09-01T08:00:00'
        },
        {
            id: 2,
            email: 'vankhanhak54@gmail.com',
            fullName: 'Nguyễn Văn Khánh (Lead Engineer)',
            status: 'ACTIVE',
            roles: ['ROLE_ADMIN', 'ROLE_CUSTOMER'],
            createdAt: '2026-09-02T09:30:00'
        },
        {
            id: 3,
            email: 'shipper.hanoi@vnpt.vn',
            fullName: 'Trần Văn Phát (Bưu Tá Hà Nội)',
            status: 'ACTIVE',
            roles: ['ROLE_SHIPPER'],
            createdAt: '2026-09-03T10:15:00'
        },
        {
            id: 4,
            email: 'hub.operator.hcm@vnpt.vn',
            fullName: 'Lê Kho Vận (Thủ Kho Hub HCM)',
            status: 'ACTIVE',
            roles: ['ROLE_HUB_OPERATOR'],
            createdAt: '2026-09-03T11:00:00'
        },
        {
            id: 5,
            email: 'cs.support@vnpt.vn',
            fullName: 'Hoàng Hỗ Trợ (Tổng Đài CSKH)',
            status: 'ACTIVE',
            roles: ['ROLE_CS'],
            createdAt: '2026-09-04T14:20:00'
        }
    ];

    const AdminService = {
        /**
         * 1. Lấy danh bạ toàn bộ quyền (Permissions) trong hệ thống
         */
        async getAllPermissions() {
            try {
                const res = await Api.get('/api/admin/permissions');
                if (res.ok) {
                    return await res.json();
                }
            } catch (e) {
                console.info('[AdminService] Backend API chưa sẵn sàng, dùng dữ liệu danh bạ quyền chuẩn.');
            }
            return FALLBACK_PERMISSIONS;
        },

        /**
         * 2. Lấy danh sách Roles kèm Permissions hiện tại
         */
        async getAllRoles() {
            try {
                const res = await Api.get('/api/admin/roles');
                if (res.ok) {
                    return await res.json();
                }
            } catch (e) {
                console.info('[AdminService] Backend API chưa sẵn sàng, dùng dữ liệu roles chuẩn.');
            }
            return FALLBACK_ROLES;
        },

        /**
         * 3. Cập nhật phân quyền cho một Role cụ thể
         * @param {number} roleId
         * @param {string[]} permissionCodes
         */
        async updateRolePermissions(roleId, permissionCodes) {
            try {
                const res = await Api.put(`/api/admin/roles/${roleId}/permissions`, {
                    permissionCodes
                });
                if (res.ok) {
                    return await res.json();
                }
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || 'Cập nhật phân quyền thất bại!');
            } catch (e) {
                // Giả lập lưu tạm thời vào local fallback nếu Backend đang viết
                const targetRole = FALLBACK_ROLES.find(r => r.id === Number(roleId));
                if (targetRole) {
                    targetRole.permissions = [...permissionCodes];
                    return targetRole;
                }
                throw e;
            }
        },

        /**
         * 4. Lấy danh sách người dùng trong hệ thống
         */
        async getAllUsers() {
            try {
                const res = await Api.get('/api/admin/users');
                if (res.ok) {
                    return await res.json();
                }
            } catch (e) {
                console.info('[AdminService] Backend API chưa sẵn sàng, dùng danh sách user chuẩn.');
            }
            return FALLBACK_USERS;
        },

        /**
         * 5. Gán vai trò mới cho tài khoản người dùng
         * @param {number} userId
         * @param {string[]} roleNames
         */
        async updateUserRoles(userId, roleNames) {
            try {
                const res = await Api.put(`/api/admin/users/${userId}/roles`, {
                    roleNames
                });
                if (res.ok) {
                    return await res.json();
                }
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || 'Cập nhật vai trò thất bại!');
            } catch (e) {
                const targetUser = FALLBACK_USERS.find(u => u.id === Number(userId));
                if (targetUser) {
                    targetUser.roles = [...roleNames];
                    return targetUser;
                }
                throw e;
            }
        },

        /**
         * 6. Khóa hoặc Kích hoạt tài khoản người dùng
         * @param {number} userId
         * @param {string} status - 'ACTIVE' | 'BLOCKED'
         */
        async updateUserStatus(userId, status) {
            try {
                const res = await Api.put(`/api/admin/users/${userId}/status`, {
                    status
                });
                if (res.ok) {
                    return await res.json();
                }
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || 'Cập nhật trạng thái thất bại!');
            } catch (e) {
                const targetUser = FALLBACK_USERS.find(u => u.id === Number(userId));
                if (targetUser) {
                    targetUser.status = status;
                    return targetUser;
                }
                throw e;
            }
        }
    };

    window.AdminService = AdminService;
})();
