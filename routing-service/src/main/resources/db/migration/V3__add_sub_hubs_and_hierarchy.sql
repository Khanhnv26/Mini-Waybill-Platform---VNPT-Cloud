-- =========================================================================
-- FLYWAY MIGRATION V3: PHÂN CẤP MẠNG LƯỚI BƯU CHÍNH 3 CẤP (HUB CON / BƯU CỤC PHÁT)
-- CƠ SỞ DỮ LIỆU: routing_db
-- =========================================================================

-- 1. Nâng cấp bảng hubs để lưu trữ Quận/Huyện và Cấp độ Bưu cục
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('hubs') AND name = 'district')
BEGIN
    ALTER TABLE hubs ADD district NVARCHAR(100) NULL;
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('hubs') AND name = 'hub_level')
BEGIN
    ALTER TABLE hubs ADD hub_level INT NOT NULL DEFAULT 1;
END;
GO

-- Cập nhật 5 Kho Tổng hiện có về Level 1
UPDATE hubs SET hub_level = 1, hub_type = 'SUPER_HUB' WHERE hub_code IN ('HUB-HN-01', 'HUB-DN-01', 'HUB-HCM-01');
UPDATE hubs SET hub_level = 1, hub_type = 'LOCAL_HUB' WHERE hub_code IN ('HUB-HP-01', 'HUB-CT-01');
GO

-- 2. Nâng cấp bảng routing để ghi nhận Bưu cục phát gửi và Bưu cục phát đích
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('routing') AND name = 'origin_post_office')
BEGIN
    ALTER TABLE routing ADD origin_post_office VARCHAR(50) NULL;
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('routing') AND name = 'dest_post_office')
BEGIN
    ALTER TABLE routing ADD dest_post_office VARCHAR(50) NULL;
END;
GO

-- 3. Khởi tạo danh mục Bưu cục phát Cấp 2/3 (Hub Con) trực thuộc các Kho Tổng

-- [HÀ NỘI]
IF NOT EXISTS (SELECT 1 FROM hubs WHERE hub_code = 'POST-HN-CG')
BEGIN
    INSERT INTO hubs (hub_code, hub_name, province, district, latitude, longitude, hub_type, parent_hub_code, hub_level)
    VALUES ('POST-HN-CG', N'Bưu Cục Cầu Giấy', N'Hà Nội', N'Cầu Giấy', 21.036200, 105.790600, 'POST_OFFICE', 'HUB-HN-01', 2);
END;

IF NOT EXISTS (SELECT 1 FROM hubs WHERE hub_code = 'POST-HN-DDA')
BEGIN
    INSERT INTO hubs (hub_code, hub_name, province, district, latitude, longitude, hub_type, parent_hub_code, hub_level)
    VALUES ('POST-HN-DDA', N'Bưu Cục Đống Đa', N'Hà Nội', N'Đống Đa', 21.018100, 105.829900, 'POST_OFFICE', 'HUB-HN-01', 2);
END;

IF NOT EXISTS (SELECT 1 FROM hubs WHERE hub_code = 'POST-HN-HBT')
BEGIN
    INSERT INTO hubs (hub_code, hub_name, province, district, latitude, longitude, hub_type, parent_hub_code, hub_level)
    VALUES ('POST-HN-HBT', N'Bưu Cục Hai Bà Trưng', N'Hà Nội', N'Hai Bà Trưng', 21.006900, 105.852400, 'POST_OFFICE', 'HUB-HN-01', 2);
END;

IF NOT EXISTS (SELECT 1 FROM hubs WHERE hub_code = 'POST-HN-TX')
BEGIN
    INSERT INTO hubs (hub_code, hub_name, province, district, latitude, longitude, hub_type, parent_hub_code, hub_level)
    VALUES ('POST-HN-TX', N'Bưu Cục Thanh Xuân', N'Hà Nội', N'Thanh Xuân', 20.993700, 105.807800, 'POST_OFFICE', 'HUB-HN-01', 2);
END;

IF NOT EXISTS (SELECT 1 FROM hubs WHERE hub_code = 'POST-HN-HD')
BEGIN
    INSERT INTO hubs (hub_code, hub_name, province, district, latitude, longitude, hub_type, parent_hub_code, hub_level)
    VALUES ('POST-HN-HD', N'Bưu Cục Hà Đông', N'Hà Nội', N'Hà Đông', 20.971200, 105.776600, 'POST_OFFICE', 'HUB-HN-01', 2);
END;

-- [TP. HỒ CHÍ MINH]
IF NOT EXISTS (SELECT 1 FROM hubs WHERE hub_code = 'POST-HCM-Q1')
BEGIN
    INSERT INTO hubs (hub_code, hub_name, province, district, latitude, longitude, hub_type, parent_hub_code, hub_level)
    VALUES ('POST-HCM-Q1', N'Bưu Cục Bến Nghé (Quận 1)', N'Hồ Chí Minh', N'Quận 1', 10.776900, 106.700900, 'POST_OFFICE', 'HUB-HCM-01', 2);
END;

IF NOT EXISTS (SELECT 1 FROM hubs WHERE hub_code = 'POST-HCM-TB')
BEGIN
    INSERT INTO hubs (hub_code, hub_name, province, district, latitude, longitude, hub_type, parent_hub_code, hub_level)
    VALUES ('POST-HCM-TB', N'Bưu Cục Tân Bình', N'Hồ Chí Minh', N'Tân Bình', 10.799200, 106.653400, 'POST_OFFICE', 'HUB-HCM-01', 2);
END;

IF NOT EXISTS (SELECT 1 FROM hubs WHERE hub_code = 'POST-HCM-BT')
BEGIN
    INSERT INTO hubs (hub_code, hub_name, province, district, latitude, longitude, hub_type, parent_hub_code, hub_level)
    VALUES ('POST-HCM-BT', N'Bưu Cục Bình Thạnh', N'Hồ Chí Minh', N'Bình Thạnh', 10.810600, 106.696100, 'POST_OFFICE', 'HUB-HCM-01', 2);
END;

IF NOT EXISTS (SELECT 1 FROM hubs WHERE hub_code = 'POST-HCM-TD')
BEGIN
    INSERT INTO hubs (hub_code, hub_name, province, district, latitude, longitude, hub_type, parent_hub_code, hub_level)
    VALUES ('POST-HCM-TD', N'Bưu Cục TP. Thủ Đức', N'Hồ Chí Minh', N'Thủ Đức', 10.849400, 106.771700, 'POST_OFFICE', 'HUB-HCM-01', 2);
END;

IF NOT EXISTS (SELECT 1 FROM hubs WHERE hub_code = 'POST-HCM-Q7')
BEGIN
    INSERT INTO hubs (hub_code, hub_name, province, district, latitude, longitude, hub_type, parent_hub_code, hub_level)
    VALUES ('POST-HCM-Q7', N'Bưu Cục Tân Phong (Quận 7)', N'Hồ Chí Minh', N'Quận 7', 10.732400, 106.708200, 'POST_OFFICE', 'HUB-HCM-01', 2);
END;

-- [ĐÀ NẴNG]
IF NOT EXISTS (SELECT 1 FROM hubs WHERE hub_code = 'POST-DN-HC')
BEGIN
    INSERT INTO hubs (hub_code, hub_name, province, district, latitude, longitude, hub_type, parent_hub_code, hub_level)
    VALUES ('POST-DN-HC', N'Bưu Cục Hải Châu', N'Đà Nẵng', N'Hải Châu', 16.067800, 108.220800, 'POST_OFFICE', 'HUB-DN-01', 2);
END;

IF NOT EXISTS (SELECT 1 FROM hubs WHERE hub_code = 'POST-DN-TK')
BEGIN
    INSERT INTO hubs (hub_code, hub_name, province, district, latitude, longitude, hub_type, parent_hub_code, hub_level)
    VALUES ('POST-DN-TK', N'Bưu Cục Thanh Khê', N'Đà Nẵng', N'Thanh Khê', 16.061300, 108.181200, 'POST_OFFICE', 'HUB-DN-01', 2);
END;

IF NOT EXISTS (SELECT 1 FROM hubs WHERE hub_code = 'POST-DN-ST')
BEGIN
    INSERT INTO hubs (hub_code, hub_name, province, district, latitude, longitude, hub_type, parent_hub_code, hub_level)
    VALUES ('POST-DN-ST', N'Bưu Cục Sơn Trà', N'Đà Nẵng', N'Sơn Trà', 16.082500, 108.243100, 'POST_OFFICE', 'HUB-DN-01', 2);
END;

-- [HẢI PHÒNG]
IF NOT EXISTS (SELECT 1 FROM hubs WHERE hub_code = 'POST-HP-NQ')
BEGIN
    INSERT INTO hubs (hub_code, hub_name, province, district, latitude, longitude, hub_type, parent_hub_code, hub_level)
    VALUES ('POST-HP-NQ', N'Bưu Cục Ngô Quyền', N'Hải Phòng', N'Ngô Quyền', 20.856100, 106.699700, 'POST_OFFICE', 'HUB-HP-01', 2);
END;

IF NOT EXISTS (SELECT 1 FROM hubs WHERE hub_code = 'POST-HP-HB')
BEGIN
    INSERT INTO hubs (hub_code, hub_name, province, district, latitude, longitude, hub_type, parent_hub_code, hub_level)
    VALUES ('POST-HP-HB', N'Bưu Cục Hồng Bàng', N'Hải Phòng', N'Hồng Bàng', 20.865300, 106.671200, 'POST_OFFICE', 'HUB-HP-01', 2);
END;

-- [CẦN THƠ]
IF NOT EXISTS (SELECT 1 FROM hubs WHERE hub_code = 'POST-CT-NK')
BEGIN
    INSERT INTO hubs (hub_code, hub_name, province, district, latitude, longitude, hub_type, parent_hub_code, hub_level)
    VALUES ('POST-CT-NK', N'Bưu Cục Ninh Kiều', N'Cần Thơ', N'Ninh Kiều', 10.034200, 105.779700, 'POST_OFFICE', 'HUB-CT-01', 2);
END;

IF NOT EXISTS (SELECT 1 FROM hubs WHERE hub_code = 'POST-CT-CR')
BEGIN
    INSERT INTO hubs (hub_code, hub_name, province, district, latitude, longitude, hub_type, parent_hub_code, hub_level)
    VALUES ('POST-CT-CR', N'Bưu Cục Cái Răng', N'Cần Thơ', N'Cái Răng', 10.003900, 105.753300, 'POST_OFFICE', 'HUB-CT-01', 2);
END;
