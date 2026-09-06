-- =========================================================================
-- HỆ THỐNG MINI WAYBILL PLATFORM
-- SCRIPT MIGRATION: LIÊN KẾT BẢNG CUSTOMERS VÀ USERS (AUTH)
-- CƠ SỞ DỮ LIỆU: SQL Server (customer_db)
-- =========================================================================

USE customer_db;
GO

-- 1. Bổ sung cột user_id (nếu chưa có)
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'customers' AND COLUMN_NAME = 'user_id'
)
BEGIN
    ALTER TABLE customers ADD user_id BIGINT NULL;
    PRINT N'[1/5] Đã thêm cột user_id vào bảng customers.';
END
ELSE
BEGIN
    PRINT N'[1/5] Cột user_id đã tồn tại trong bảng customers.';
END
GO

-- 2. Xóa bỏ Unique Constraint cũ trên phone_number để hỗ trợ nhiều giá trị NULL
DECLARE @ConstraintName NVARCHAR(200);
SELECT @ConstraintName = name 
FROM sys.indexes 
WHERE object_id = OBJECT_ID('customers') 
  AND is_unique = 1 
  AND is_primary_key = 0 
  AND index_id IN (
      SELECT index_id FROM sys.index_columns 
      WHERE object_id = OBJECT_ID('customers') 
        AND column_id = COLUMNPROPERTY(OBJECT_ID('customers'), 'phone_number', 'ColumnId')
  );

IF @ConstraintName IS NOT NULL
BEGIN
    IF EXISTS (SELECT 1 FROM sys.key_constraints WHERE name = @ConstraintName)
        EXEC('ALTER TABLE customers DROP CONSTRAINT ' + @ConstraintName);
    ELSE
        EXEC('DROP INDEX ' + @ConstraintName + ' ON customers');
    PRINT N'[2/5] Đã xóa ràng buộc unique cũ trên phone_number: ' + @ConstraintName;
END
ELSE
BEGIN
    PRINT N'[2/5] Không tìm thấy ràng buộc unique cũ trên phone_number (bỏ qua).';
END
GO

-- 3. Nới lỏng cột address và phone_number cho phép NULL
ALTER TABLE customers ALTER COLUMN address NVARCHAR(255) NULL;
ALTER TABLE customers ALTER COLUMN phone_number VARCHAR(255) NULL;
PRINT N'[3/5] Đã cập nhật address và phone_number cho phép nhận giá trị NULL.';
GO

-- 4. Backfill dữ liệu an toàn cho các tài khoản hiện có
-- Bước 4.1: Khớp user_id = id cho các tài khoản cũ có id trùng nhau
UPDATE c
SET c.user_id = c.id
FROM customers c
WHERE c.user_id IS NULL 
  AND c.id IN (SELECT id FROM auth_db.dbo.users);
PRINT N'[4/5] Bước 4.1: Đã backfill user_id = id cho các bản ghi cũ.';
GO

-- Bước 4.2: Khớp theo email nếu có bản ghi chưa gán user_id
UPDATE c
SET c.user_id = u.id
FROM customers c
INNER JOIN auth_db.dbo.users u ON c.email = u.email
WHERE c.user_id IS NULL;
PRINT N'[4/5] Bước 4.2: Đã backfill user_id theo email trùng khớp.';
GO

-- Bước 4.3: Tự động thêm bản ghi customer cho các user trong auth_db chưa có hồ sơ
INSERT INTO customers (customer_code, full_name, email, phone_number, address, status, created_at, user_id)
SELECT 
    'CUS' + RIGHT('000000' + CAST(u.id AS VARCHAR(10)), 6),
    u.full_name,
    u.email,
    NULL,
    NULL,
    'ACTIVE',
    GETDATE(),
    u.id
FROM auth_db.dbo.users u
WHERE u.id NOT IN (SELECT user_id FROM customers WHERE user_id IS NOT NULL);
PRINT N'[4/5] Bước 4.3: Đã tạo hồ sơ customer mới cho các user trong auth_db chưa có.';
GO

-- 5. Tạo Filtered Unique Indexes trên SQL Server (chỉ bắt buộc duy nhất khi NOT NULL)
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_customers_user_id' AND object_id = OBJECT_ID('customers'))
BEGIN
    CREATE UNIQUE INDEX UX_customers_user_id ON customers(user_id) WHERE user_id IS NOT NULL;
    PRINT N'[5/5] Đã tạo Filtered Unique Index UX_customers_user_id (WHERE user_id IS NOT NULL).';
END
ELSE
BEGIN
    PRINT N'[5/5] Index UX_customers_user_id đã tồn tại.';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_customers_phone_number' AND object_id = OBJECT_ID('customers'))
BEGIN
    CREATE UNIQUE INDEX UX_customers_phone_number ON customers(phone_number) WHERE phone_number IS NOT NULL;
    PRINT N'[5/5] Đã tạo Filtered Unique Index UX_customers_phone_number (WHERE phone_number IS NOT NULL).';
END
ELSE
BEGIN
    PRINT N'[5/5] Index UX_customers_phone_number đã tồn tại.';
END
GO

PRINT N'=== HOÀN TẤT MIGRATION LIÊN KẾT USERS - CUSTOMERS THÀNH CÔNG ===';
GO
