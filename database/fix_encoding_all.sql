USE routing_db;
GO

-- 1. Đảm bảo cột NVARCHAR
ALTER TABLE hubs ALTER COLUMN hub_name NVARCHAR(150) NOT NULL;
ALTER TABLE hubs ALTER COLUMN province NVARCHAR(100) NOT NULL;
GO

-- 2. Cập nhật tên chuẩn tiếng Việt Unicode
UPDATE hubs SET hub_name = N'Kho Tổng Hà Nội', province = N'Hà Nội' WHERE hub_code = 'HUB-HN-01';
UPDATE hubs SET hub_name = N'Kho Tổng Hải Phòng', province = N'Hải Phòng' WHERE hub_code = 'HUB-HP-01';
UPDATE hubs SET hub_name = N'Kho Tổng Đà Nẵng', province = N'Đà Nẵng' WHERE hub_code = 'HUB-DN-01';
UPDATE hubs SET hub_name = N'Kho Tổng TP. Hồ Chí Minh', province = N'Hồ Chí Minh' WHERE hub_code = 'HUB-HCM-01';
UPDATE hubs SET hub_name = N'Kho Tổng Cần Thơ', province = N'Cần Thơ' WHERE hub_code = 'HUB-CT-01';
GO

-- 3. Cập nhật luôn cho customer_db
USE customer_db;
GO

ALTER TABLE customers ALTER COLUMN address NVARCHAR(255) NOT NULL;
GO

UPDATE customers SET full_name = N'Văn Khánh', address = N'Hà Nội' WHERE id = 1;
UPDATE customers SET full_name = N'Nguyễn Văn B', address = N'Cầu Giấy, Hà Nội' WHERE id = 2;
UPDATE customers SET full_name = N'Quản Trị Viên VNPT', address = N'57 Huỳnh Thúc Kháng, Đống Đa, Hà Nội' WHERE id = 5;
GO

-- 4. Cập nhật luôn cho shipment_db
USE shipment_db;
GO

ALTER TABLE shipments ALTER COLUMN sender_address NVARCHAR(255) NOT NULL;
ALTER TABLE shipments ALTER COLUMN receiver_address NVARCHAR(255) NOT NULL;
GO
