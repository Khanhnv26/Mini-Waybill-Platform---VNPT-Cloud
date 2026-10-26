-- =========================================================================
-- FLYWAY MIGRATION V9: TỐI ƯU HÓA CHỈ MỤC HIỆU NĂNG CHO BẢNG TRIPS
-- CƠ SỞ DỮ LIỆU: routing_db
-- =========================================================================

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;

-- 1. Covering Compound Index cho thuật toán tìm chuyến xe gom đơn khả dụng (findAvailableTrips)
-- Giúp chuyển từ Clustered Index Scan sang Nonclustered Index Seek + Range Scan, tránh Key Lookup
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_trips_hub_status_schedule' AND object_id = OBJECT_ID('trips'))
BEGIN
    CREATE NONCLUSTERED INDEX idx_trips_hub_status_schedule
    ON trips(current_hub, status, scheduled_departure_time ASC)
    INCLUDE (max_weight_kg, current_weight_kg, trip_code);
END;

-- 2. Compound Index hỗ trợ truy vấn danh sách chuyến xe theo trạng thái sắp xếp theo thời gian tạo
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_trips_status_created' AND object_id = OBJECT_ID('trips'))
BEGIN
    CREATE NONCLUSTERED INDEX idx_trips_status_created
    ON trips(status, created_at DESC);
END;

-- 3. Index sắp xếp toàn bộ chuyến xe theo thời gian tạo mới nhất
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_trips_created_at' AND object_id = OBJECT_ID('trips'))
BEGIN
    CREATE NONCLUSTERED INDEX idx_trips_created_at
    ON trips(created_at DESC);
END;
