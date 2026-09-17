-- =========================================================================
-- SHIPMENT-SERVICE MIGRATION: V4
-- Chuyển toàn bộ vận đơn cũ của tài khoản Admin/Nhân viên nội bộ sang Khách Lẻ Vãng Lai
-- =========================================================================
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;

DECLARE @RetailCustomerId BIGINT = NULL;

-- 1. Tìm ID của tài khoản CUS_RETAIL từ customer_db nếu trên cùng SQL Server instance
IF EXISTS (SELECT 1 FROM sys.databases WHERE name = 'customer_db')
BEGIN
    SELECT @RetailCustomerId = id 
    FROM customer_db.dbo.customers 
    WHERE customer_code = 'CUS_RETAIL';
END;

-- 2. Fallback nếu không kết nối được cross-db
IF @RetailCustomerId IS NULL
BEGIN
    SET @RetailCustomerId = 14;
END;

-- 3. Cập nhật các đơn bưu gửi cũ của nhân viên nội bộ sang CUS_RETAIL
IF EXISTS (SELECT 1 FROM sys.databases WHERE name = 'customer_db')
BEGIN
    UPDATE s
    SET s.customer_id = @RetailCustomerId
    FROM shipments s
    WHERE s.customer_id IN (
        SELECT c.id FROM customer_db.dbo.customers c 
        WHERE c.email IN ('admin@waybill.vn', 'hub.operator@waybill.vn', 'post.operator@waybill.vn', 'shipper@waybill.vn')
    );
END;

-- Đảm bảo các đơn test cũ với customer_id = 5 (Admin cũ) được chuyển sang CUS_RETAIL
UPDATE shipments
SET customer_id = @RetailCustomerId
WHERE customer_id = 5;
