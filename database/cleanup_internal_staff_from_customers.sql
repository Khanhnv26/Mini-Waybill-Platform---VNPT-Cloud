-- =========================================================================
-- HỆ THỐNG MINI WAYBILL PLATFORM
-- SCRIPT LÀM SẠCH DỮ LIỆU: PHÂN TÁCH NHÂN VIÊN NỘI BỘ KHỎI BẢNG CUSTOMERS
-- =========================================================================
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

-- 1. Bổ sung bản ghi Khách lẻ vãng lai tại quầy (CUS_RETAIL, user_id = NULL)
USE customer_db;
GO

IF NOT EXISTS (SELECT 1 FROM customers WHERE customer_code = 'CUS_RETAIL')
BEGIN
    INSERT INTO customers (customer_code, full_name, email, phone_number, address, status, created_at, user_id)
    VALUES (
        'CUS_RETAIL',
        N'Khách Lẻ Vãng Lai (Bưu Cục Quầy)',
        'retail.counter@waybill.vn',
        '1900545481',
        N'Điểm Tiếp Nhận Quầy Giao Dịch Bưu Chính',
        'ACTIVE',
        GETDATE(),
        NULL
    );
    PRINT N'[1/3] Đã khởi tạo hồ sơ CUS_RETAIL.';
END
ELSE
BEGIN
    PRINT N'[1/3] Hồ sơ CUS_RETAIL đã tồn tại.';
END
GO

-- 2. Chuyển các đơn hàng cũ của tài khoản nhân viên nội bộ sang CUS_RETAIL
USE shipment_db;
GO

DECLARE @RetailId BIGINT = (SELECT id FROM customer_db.dbo.customers WHERE customer_code = 'CUS_RETAIL');

IF @RetailId IS NOT NULL
BEGIN
    -- Chuyển các đơn test cũ của Admin (customer_id = 5)
    UPDATE shipments
    SET customer_id = @RetailId
    WHERE customer_id = 5;

    -- Chuyển các đơn khác nếu có gắn với nhân viên nội bộ
    UPDATE s
    SET s.customer_id = @RetailId
    FROM shipments s
    WHERE s.customer_id IN (
        SELECT c.id FROM customer_db.dbo.customers c
        WHERE c.email IN ('admin@waybill.vn', 'hub.operator@waybill.vn', 'post.operator@waybill.vn', 'shipper@waybill.vn')
    );

    PRINT N'[2/3] Đã chuyển đổi vận đơn cũ của nhân viên nội bộ sang CUS_RETAIL (ID: ' + CAST(@RetailId AS VARCHAR(10)) + ').';
END
GO

-- 3. Xóa các bản ghi nhân viên nội bộ khỏi customer_db
USE customer_db;
GO

DELETE FROM customers 
WHERE email IN (
    'admin@waybill.vn',
    'hub.operator@waybill.vn',
    'post.operator@waybill.vn',
    'shipper@waybill.vn'
);
PRINT N'[3/3] Đã xóa toàn bộ hồ sơ Customer của nhân viên nội bộ hoàn tất!';
GO
