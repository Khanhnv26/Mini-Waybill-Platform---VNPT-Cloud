-- =========================================================================
-- HỆ THỐNG MINI WAYBILL PLATFORM
-- SCRIPT TỰ ĐỘNG TẠO BẢNG & NẠP DỮ LIỆU PHÂN QUYỀN (RBAC FULL SETUP)
-- CƠ SỞ DỮ LIỆU: SQL Server (auth_db)
-- =========================================================================

USE auth_db;
GO

-- -------------------------------------------------------------------------
-- 0. TỰ ĐỘNG TẠO BẢNG permissions VÀ role_permissions NẾU CHƯA TỒN TẠI
-- -------------------------------------------------------------------------
IF OBJECT_ID('permissions', 'U') IS NULL
BEGIN
    CREATE TABLE permissions (
        id BIGINT IDENTITY(1,1) PRIMARY KEY,
        code VARCHAR(50) NOT NULL UNIQUE,
        name NVARCHAR(100) NOT NULL,
        module VARCHAR(100) NOT NULL,
        description NVARCHAR(MAX) NOT NULL
    );
    PRINT N'Đã tạo mới bảng permissions.';
END
GO

IF OBJECT_ID('role_permissions', 'U') IS NULL
BEGIN
    CREATE TABLE role_permissions (
        role_id BIGINT NOT NULL,
        permission_id BIGINT NOT NULL,
        PRIMARY KEY (role_id, permission_id),
        CONSTRAINT FK_role_perm_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
        CONSTRAINT FK_role_perm_perm FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
    );
    PRINT N'Đã tạo mới bảng trung gian role_permissions.';
END
GO

-- -------------------------------------------------------------------------
-- 1. BỔ SUNG 15 QUYỀN HẠN CHI TIẾT (PERMISSIONS)
-- -------------------------------------------------------------------------
PRINT N'Đang nạp danh mục 15 Permissions...';

-- Phân hệ PROFILE
IF NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'profile:read')
    INSERT INTO permissions (code, name, module, description) VALUES ('profile:read', N'Xem thông tin cá nhân', 'PROFILE', N'Đọc profile, thông tin tài khoản đang đăng nhập');

IF NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'profile:update')
    INSERT INTO permissions (code, name, module, description) VALUES ('profile:update', N'Cập nhật thông tin', 'PROFILE', N'Đổi họ tên, số điện thoại, avatar');

IF NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'password:change')
    INSERT INTO permissions (code, name, module, description) VALUES ('password:change', N'Tự đổi mật khẩu', 'PROFILE', N'Đổi mật khẩu tài khoản chủ động');

-- Phân hệ SHIPMENT
IF NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'shipment:create')
    INSERT INTO permissions (code, name, module, description) VALUES ('shipment:create', N'Tạo vận đơn mới', 'SHIPMENT', N'Gọi API tạo đơn kèm Idempotency-Key');

IF NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'shipment:read_own')
    INSERT INTO permissions (code, name, module, description) VALUES ('shipment:read_own', N'Xem đơn của chính mình', 'SHIPMENT', N'Chỉ xem danh sách và chi tiết các đơn do mình tạo');

IF NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'shipment:read_all')
    INSERT INTO permissions (code, name, module, description) VALUES ('shipment:read_all', N'Xem toàn bộ đơn hàng', 'SHIPMENT', N'Xem đơn của tất cả khách hàng trên hệ thống');

-- Phân hệ TRACKING
IF NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'tracking:read_public')
    INSERT INTO permissions (code, name, module, description) VALUES ('tracking:read_public', N'Tra cứu nhanh công khai', 'TRACKING', N'Tra cứu lộ trình đã che mờ thông tin cá nhân');

IF NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'tracking:read_full')
    INSERT INTO permissions (code, name, module, description) VALUES ('tracking:read_full', N'Tra cứu chi tiết đầy đủ', 'TRACKING', N'Xem đầy đủ số điện thoại và địa chỉ giao nhận');

IF NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'tracking:update_hub')
    INSERT INTO permissions (code, name, module, description) VALUES ('tracking:update_hub', N'Quét mã trạm kho', 'TRACKING', N'Cập nhật trạng thái PICKED_UP và IN_TRANSIT');

IF NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'tracking:update_delivery')
    INSERT INTO permissions (code, name, module, description) VALUES ('tracking:update_delivery', N'Báo phát giao hàng', 'TRACKING', N'Cập nhật trạng thái DELIVERED và DELIVERY_FAILED');

-- Phân hệ AUDIT
IF NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'audit:read')
    INSERT INTO permissions (code, name, module, description) VALUES ('audit:read', N'Tra cứu nhật ký Audit', 'AUDIT', N'Xem chuỗi event Kafka theo mã vận đơn');

-- Phân hệ USER
IF NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'user:read')
    INSERT INTO permissions (code, name, module, description) VALUES ('user:read', N'Xem danh sách user', 'USER', N'Xem danh sách người dùng, phân trang và tìm kiếm');

IF NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'user:update_status')
    INSERT INTO permissions (code, name, module, description) VALUES ('user:update_status', N'Khóa/Mở tài khoản', 'USER', N'Chuyển trạng thái ACTIVE / LOCKED');

IF NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'user:assign_role')
    INSERT INTO permissions (code, name, module, description) VALUES ('user:assign_role', N'Gán vai trò tài khoản', 'USER', N'Cập nhật danh sách Role cho người dùng');

-- Phân hệ ROUTING
IF NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'routing:manage')
    INSERT INTO permissions (code, name, module, description) VALUES ('routing:manage', N'Quản lý tuyến & Hub', 'ROUTING', N'Cấu hình danh mục bưu cục, tọa độ và tuyến giao');

PRINT N'Khởi tạo Permissions hoàn tất!';
GO

-- -------------------------------------------------------------------------
-- 2. KHỞI TẠO 5 VAI TRÒ (ROLES)
-- -------------------------------------------------------------------------
PRINT N'Đang nạp 5 Roles...';

IF NOT EXISTS (SELECT 1 FROM roles WHERE name = 'ROLE_CUSTOMER')
    INSERT INTO roles (name, description) VALUES ('ROLE_CUSTOMER', N'Khách hàng / Chủ shop gửi hàng');

IF NOT EXISTS (SELECT 1 FROM roles WHERE name = 'ROLE_SHIPPER')
    INSERT INTO roles (name, description) VALUES ('ROLE_SHIPPER', N'Bưu tá giao nhận chặng cuối');

IF NOT EXISTS (SELECT 1 FROM roles WHERE name = 'ROLE_HUB_OPERATOR')
    INSERT INTO roles (name, description) VALUES ('ROLE_HUB_OPERATOR', N'Nhân viên kho bãi / Hub trung chuyển');

IF NOT EXISTS (SELECT 1 FROM roles WHERE name = 'ROLE_CS')
    INSERT INTO roles (name, description) VALUES ('ROLE_CS', N'Nhân viên Chăm sóc khách hàng');

IF NOT EXISTS (SELECT 1 FROM roles WHERE name = 'ROLE_ADMIN')
    INSERT INTO roles (name, description) VALUES ('ROLE_ADMIN', N'Quản trị viên toàn quyền hệ thống');

PRINT N'Khởi tạo Roles hoàn tất!';
GO

-- -------------------------------------------------------------------------
-- 3. GÁN PERMISSIONS CHO TỪNG ROLE (BẢNG role_permissions) - SET-BASED SQL
-- -------------------------------------------------------------------------
PRINT N'Đang gán quyền cho từng vai trò...';

-- 3.1. Gán cho ROLE_CUSTOMER
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'ROLE_CUSTOMER'
  AND p.code IN ('profile:read', 'profile:update', 'password:change', 'shipment:create', 'shipment:read_own', 'tracking:read_public')
  AND NOT EXISTS (SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id);

-- 3.2. Gán cho ROLE_SHIPPER
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'ROLE_SHIPPER'
  AND p.code IN ('profile:read', 'password:change', 'tracking:read_public', 'tracking:read_full', 'tracking:update_delivery')
  AND NOT EXISTS (SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id);

-- 3.3. Gán cho ROLE_HUB_OPERATOR
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'ROLE_HUB_OPERATOR'
  AND p.code IN ('profile:read', 'password:change', 'tracking:read_public', 'tracking:read_full', 'tracking:update_hub')
  AND NOT EXISTS (SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id);

-- 3.4. Gán cho ROLE_CS
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'ROLE_CS'
  AND p.code IN ('profile:read', 'password:change', 'shipment:read_all', 'tracking:read_public', 'tracking:read_full', 'audit:read')
  AND NOT EXISTS (SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id);

-- 3.5. Gán cho ROLE_ADMIN (Toàn bộ 15 quyền)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'ROLE_ADMIN'
  AND NOT EXISTS (SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id);

PRINT N'Gán quyền cho Roles hoàn tất!';
GO

-- -------------------------------------------------------------------------
-- 4. TẠO TÀI KHOẢN ADMIN MẶC ĐỊNH (admin@waybill.vn / Admin@123456)
-- -------------------------------------------------------------------------
PRINT N'Đang khởi tạo tài khoản Admin mặc định...';

-- Mật khẩu "Admin@123456" mã hóa BCrypt:
-- $2a$10$KqcMs2kyTysvFRxWltdp4OAKvki.ghZEEXC.yymChFIkHs.jJqLY2

IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@waybill.vn')
BEGIN
    INSERT INTO users (email, password, full_name, google_sub, status, created_at)
    VALUES (
        'admin@waybill.vn',
        '$2a$10$KqcMs2kyTysvFRxWltdp4OAKvki.ghZEEXC.yymChFIkHs.jJqLY2',
        N'Quản Trị Viên Hệ Thống',
        'ADMIN_LOCAL_SYSTEM',
        'ACTIVE',
        GETDATE()
    );
    PRINT N'Đã tạo tài khoản admin@waybill.vn';
END
ELSE
BEGIN
    PRINT N'Tài khoản admin@waybill.vn đã tồn tại.';
END
GO

-- Gán ROLE_ADMIN cho admin@waybill.vn
DECLARE @AdminUserId BIGINT = (SELECT id FROM users WHERE email = 'admin@waybill.vn');
DECLARE @AdminRoleId BIGINT = (SELECT id FROM roles WHERE name = 'ROLE_ADMIN');

IF @AdminUserId IS NOT NULL AND @AdminRoleId IS NOT NULL
BEGIN
    IF NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = @AdminUserId AND role_id = @AdminRoleId)
    BEGIN
        INSERT INTO user_roles (user_id, role_id) VALUES (@AdminUserId, @AdminRoleId);
        PRINT N'Đã gán ROLE_ADMIN cho admin@waybill.vn';
    END
    ELSE
    BEGIN
        PRINT N'admin@waybill.vn đã có ROLE_ADMIN.';
    END
END
GO

-- Gán thêm ROLE_ADMIN cho tài khoản vankhanhak54@gmail.com (id=1) nếu chưa có
DECLARE @KhanhUserId BIGINT = (SELECT id FROM users WHERE email = 'vankhanhak54@gmail.com');
DECLARE @RoleIdAdmin BIGINT = (SELECT id FROM roles WHERE name = 'ROLE_ADMIN');

IF @KhanhUserId IS NOT NULL AND @RoleIdAdmin IS NOT NULL
BEGIN
    IF NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = @KhanhUserId AND role_id = @RoleIdAdmin)
    BEGIN
        INSERT INTO user_roles (user_id, role_id) VALUES (@KhanhUserId, @RoleIdAdmin);
        PRINT N'Đã gán ROLE_ADMIN cho vankhanhak54@gmail.com';
    END
END
GO

PRINT N'=== TOÀN BỘ QUÁ TRÌNH SETUP RBAC ĐÃ HOÀN TẤT THÀNH CÔNG! ===';
