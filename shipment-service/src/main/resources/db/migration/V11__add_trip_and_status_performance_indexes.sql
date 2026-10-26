-- =========================================================================
-- FLYWAY MIGRATION V11: TỐI ƯU HÓA CHỈ MỤC BẢNG SHIPMENTS (CHUYẾN XE & TRẠNG THÁI)
-- CƠ SỞ DỮ LIỆU: shipment_db
-- =========================================================================

-- 1. Nonclustered Filtered Index cho assigned_trip_code phục vụ điều phối và tài xế gom hàng theo chuyến
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_shipments_assigned_trip' AND object_id = OBJECT_ID('shipments'))
BEGIN
    CREATE NONCLUSTERED INDEX idx_shipments_assigned_trip
    ON shipments(assigned_trip_code)
    WHERE assigned_trip_code IS NOT NULL;
END;

-- 2. Compound Index tra cứu bưu gửi theo mã vận đơn và trạng thái hiện tại
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_shipments_tracking_status' AND object_id = OBJECT_ID('shipments'))
BEGIN
    CREATE NONCLUSTERED INDEX idx_shipments_tracking_status
    ON shipments(tracking_code, current_status);
END;
