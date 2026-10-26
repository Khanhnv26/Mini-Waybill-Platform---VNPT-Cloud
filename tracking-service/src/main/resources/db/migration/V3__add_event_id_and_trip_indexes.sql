-- =========================================================================
-- FLYWAY MIGRATION V3: TỐI ƯU HÓA CHỈ MỤC CHO SỰ KIỆN VÀ CHUYẾN XE (TRACKING)
-- CƠ SỞ DỮ LIỆU: tracking_db
-- =========================================================================

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;

-- 1. Nonclustered Filtered Index cho event_id phục vụ kiểm tra tính Idempotent khi tiêu thụ Kafka Event
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_tracking_history_event_id' AND object_id = OBJECT_ID('tracking_history'))
BEGIN
    CREATE NONCLUSTERED INDEX idx_tracking_history_event_id
    ON tracking_history(event_id)
    WHERE event_id IS NOT NULL;
END;

-- 2. Nonclustered Filtered Index cho trip_code phục vụ tra cứu lịch sử hành trình theo chuyến xe
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_tracking_history_trip_code' AND object_id = OBJECT_ID('tracking_history'))
BEGIN
    CREATE NONCLUSTERED INDEX idx_tracking_history_trip_code
    ON tracking_history(trip_code)
    WHERE trip_code IS NOT NULL;
END;
