-- =========================================================================
-- HỆ THỐNG MINI WAYBILL PLATFORM
-- SCRIPT KHỞI TẠO DỮ LIỆU PHÂN QUYỀN (RBAC SEED DATA)
-- CƠ SỞ DỮ LIỆU: SQL Server (auth_db)
--
-- LƯU Ý QUAN TRỌNG VỀ ENCODING TIẾNG VIỆT TRÊN WINDOWS:
-- sqlcmd mặc định dùng mã trang ANSI (CP1252/CP437). Khi chạy script bằng terminal,
-- BẮT BUỘC thêm tham số -f 65001 để nạp chuẩn UTF-8 Unicode tiếng Việt:
--   sqlcmd -S localhost -U sa -P sa -d auth_db -C -f 65001 -i database/seed_rbac_data.sql
-- =========================================================================

USE auth_db;
GO

-- -------------------------------------------------------------------------
-- 1. BỔ SUNG 15 QUYỀN HẠN CHI TIẾT (PERMISSIONS) VỚI CƠ CHẾ UPSERT
-- -------------------------------------------------------------------------
PRINT N'Đang khởi tạo danh mục Permissions...';
GO

CREATE OR ALTER PROCEDURE #UpsertPermission
    @code VARCHAR(50),
    @name NVARCHAR(100),
    @module VARCHAR(100),
    @description NVARCHAR(MAX)
AS
BEGIN
    IF EXISTS (SELECT 1 FROM permissions WHERE code = @code)
        UPDATE permissions SET name = @name, module = @module, description = @description WHERE code = @code;
    ELSE
        INSERT INTO permissions (code, name, module, description) VALUES (@code, @name, @module, @description);
END;
GO

-- Phân hệ PROFILE
EXEC #UpsertPermission 'profile:read', N'Xem thông tin cá nhân', 'PROFILE', N'Đọc profile, thông tin tài khoản đang đăng nhập';
EXEC #UpsertPermission 'profile:update', N'Cập nhật thông tin', 'PROFILE', N'Đổi họ tên, số điện thoại, avatar';
EXEC #UpsertPermission 'password:change', N'Tự đổi mật khẩu', 'PROFILE', N'Đổi mật khẩu tài khoản chủ động';

-- Phân hệ SHIPMENT
EXEC #UpsertPermission 'shipment:create', N'Tạo vận đơn mới', 'SHIPMENT', N'Gọi API tạo đơn kèm Idempotency-Key';
EXEC #UpsertPermission 'shipment:read_own', N'Xem đơn của chính mình', 'SHIPMENT', N'Chỉ xem danh sách và chi tiết các đơn do mình tạo';
EXEC #UpsertPermission 'shipment:read_all', N'Xem toàn bộ đơn hàng', 'SHIPMENT', N'Xem đơn của tất cả khách hàng trên hệ thống';

-- Phân hệ TRACKING
EXEC #UpsertPermission 'tracking:read_public', N'Tra cứu nhanh công khai', 'TRACKING', N'Tra cứu lộ trình đã che mờ thông tin cá nhân';
EXEC #UpsertPermission 'tracking:read_full', N'Tra cứu chi tiết đầy đủ', 'TRACKING', N'Xem đầy đủ số điện thoại và địa chỉ giao nhận';
EXEC #UpsertPermission 'tracking:update_hub', N'Quét mã trạm kho', 'TRACKING', N'Cập nhật trạng thái PICKED_UP và IN_TRANSIT';
EXEC #UpsertPermission 'tracking:update_delivery', N'Báo phát giao hàng', 'TRACKING', N'Cập nhật trạng thái DELIVERED và DELIVERY_FAILED';

-- Phân hệ AUDIT
EXEC #UpsertPermission 'audit:read', N'Tra cứu nhật ký Audit', 'AUDIT', N'Xem chuỗi event Kafka theo mã vận đơn';

-- Phân hệ USER
EXEC #UpsertPermission 'user:read', N'Xem danh sách user', 'USER', N'Xem danh sách người dùng, phân trang và tìm kiếm';
EXEC #UpsertPermission 'user:update_status', N'Khóa/Mở tài khoản', 'USER', N'Chuyển trạng thái ACTIVE / BLOCKED';
EXEC #UpsertPermission 'user:assign_role', N'Gán vai trò tài khoản', 'USER', N'Cập nhật danh sách Role cho người dùng';

-- Phân hệ ROUTING
EXEC #UpsertPermission 'routing:manage', N'Quản lý tuyến & Hub', 'ROUTING', N'Cấu hình danh mục bưu cục, tọa độ và tuyến giao';

PRINT N'Khởi tạo Permissions hoàn tất!';
GO

-- -------------------------------------------------------------------------
-- 2. KHỞI TẠO 5 VAI TRÒ (ROLES)
-- -------------------------------------------------------------------------
PRINT N'Đang khởi tạo Roles...';

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
-- 3. GÁN PERMISSIONS CHO TỪNG ROLE (BẢNG role_permissions)
-- -------------------------------------------------------------------------
PRINT N'Đang gán quyền cho các Roles...';
GO

-- Thủ tục gán quyền an toàn (tránh trùng lặp)
CREATE OR ALTER PROCEDURE #AddPermissionToRole 
    @RoleName VARCHAR(50), 
    @PermCode VARCHAR(50)
AS
BEGIN
    DECLARE @RoleId BIGINT = (SELECT id FROM roles WHERE name = @RoleName);
    DECLARE @PermId BIGINT = (SELECT id FROM permissions WHERE code = @PermCode);

    IF @RoleId IS NOT NULL AND @PermId IS NOT NULL
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM role_permissions WHERE role_id = @RoleId AND permission_id = @PermId)
        BEGIN
            INSERT INTO role_permissions (role_id, permission_id) VALUES (@RoleId, @PermId);
        END
    END
END;
GO

-- 3.1. Gán cho ROLE_CUSTOMER
EXEC #AddPermissionToRole 'ROLE_CUSTOMER', 'profile:read';
EXEC #AddPermissionToRole 'ROLE_CUSTOMER', 'profile:update';
EXEC #AddPermissionToRole 'ROLE_CUSTOMER', 'password:change';
EXEC #AddPermissionToRole 'ROLE_CUSTOMER', 'shipment:create';
EXEC #AddPermissionToRole 'ROLE_CUSTOMER', 'shipment:read_own';
EXEC #AddPermissionToRole 'ROLE_CUSTOMER', 'tracking:read_public';

-- 3.2. Gán cho ROLE_SHIPPER
EXEC #AddPermissionToRole 'ROLE_SHIPPER', 'profile:read';
EXEC #AddPermissionToRole 'ROLE_SHIPPER', 'password:change';
EXEC #AddPermissionToRole 'ROLE_SHIPPER', 'tracking:read_public';
EXEC #AddPermissionToRole 'ROLE_SHIPPER', 'tracking:read_full';
EXEC #AddPermissionToRole 'ROLE_SHIPPER', 'tracking:update_delivery';

-- 3.3. Gán cho ROLE_HUB_OPERATOR
EXEC #AddPermissionToRole 'ROLE_HUB_OPERATOR', 'profile:read';
EXEC #AddPermissionToRole 'ROLE_HUB_OPERATOR', 'password:change';
EXEC #AddPermissionToRole 'ROLE_HUB_OPERATOR', 'tracking:read_public';
EXEC #AddPermissionToRole 'ROLE_HUB_OPERATOR', 'tracking:read_full';
EXEC #AddPermissionToRole 'ROLE_HUB_OPERATOR', 'tracking:update_hub';

-- 3.4. Gán cho ROLE_CS
EXEC #AddPermissionToRole 'ROLE_CS', 'profile:read';
EXEC #AddPermissionToRole 'ROLE_CS', 'password:change';
EXEC #AddPermissionToRole 'ROLE_CS', 'shipment:read_all';
EXEC #AddPermissionToRole 'ROLE_CS', 'tracking:read_public';
EXEC #AddPermissionToRole 'ROLE_CS', 'tracking:read_full';
EXEC #AddPermissionToRole 'ROLE_CS', 'audit:read';

-- 3.5. Gán cho ROLE_ADMIN (Toàn bộ 15 quyền)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM roles r, permissions p
WHERE r.name = 'ROLE_ADMIN'
  AND NOT EXISTS (
      SELECT 1 FROM role_permissions rp 
      WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

PRINT N'Gán quyền cho Roles hoàn tất!';
GO

-- -------------------------------------------------------------------------
-- 4. TẠO TÀI KHOẢN ADMIN MẶC ĐỊNH (admin@waybill.vn / Admin@123456)
-- -------------------------------------------------------------------------
PRINT N'Đang kiểm tra tài khoản Admin mặc định...';

-- Mật khẩu "Admin@123456" mã hóa bằng BCrypt:
-- $2a$10$KqcMs2kyTysvFRxWltdp4OAKvki.ghZEEXC.yymChFIkHs.jJqLY2

IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@waybill.vn')
BEGIN
    INSERT INTO users (email, password, full_name, status, created_at)
    VALUES (
        'admin@waybill.vn',
        '$2a$10$KqcMs2kyTysvFRxWltdp4OAKvki.ghZEEXC.yymChFIkHs.jJqLY2',
        N'Quản Trị Viên Hệ Thống',
        'ACTIVE',
        GETDATE()
    );
    PRINT N'Đã tạo tài khoản admin@waybill.vn';
END
ELSE
BEGIN
    UPDATE users SET full_name = N'Quản Trị Viên Hệ Thống' WHERE email = 'admin@waybill.vn';
    PRINT N'Đã cập nhật họ tên chuẩn cho admin@waybill.vn';
END

-- Gán ROLE_ADMIN cho tài khoản admin@waybill.vn
DECLARE @AdminUserId BIGINT = (SELECT id FROM users WHERE email = 'admin@waybill.vn');
DECLARE @AdminRoleId BIGINT = (SELECT id FROM roles WHERE name = 'ROLE_ADMIN');

IF @AdminUserId IS NOT NULL AND @AdminRoleId IS NOT NULL
BEGIN
    IF NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = @AdminUserId AND role_id = @AdminRoleId)
    BEGIN
        INSERT INTO user_roles (user_id, role_id) VALUES (@AdminUserId, @AdminRoleId);
        PRINT N'Đã gán ROLE_ADMIN cho admin@waybill.vn';
    END
END
GO

PRINT N'=== TOÀN BỘ QUÁ TRÌNH SEED DỮ LIỆU ĐÃ HOÀN TẤT THÀNH CÔNG! ===';
