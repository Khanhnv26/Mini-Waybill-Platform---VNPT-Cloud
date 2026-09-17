-- =========================================================================
-- CUSTOMER-SERVICE MIGRATION: V1
-- Khởi tạo khách vãng lai và làm sạch hồ sơ nhân viên nội bộ
-- =========================================================================
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;

-- 1. Đảm bảo bản ghi Khách lẻ vãng lai tại quầy (CUS_RETAIL) luôn tồn tại
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
END;

-- 2. Dọn dẹp các hồ sơ Customer cũ của nhân viên nội bộ theo email
DELETE FROM customers 
WHERE email IN (
    'admin@waybill.vn',
    'hub.operator@waybill.vn',
    'post.operator@waybill.vn',
    'shipper@waybill.vn'
);
