-- =========================================================================

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('hubs') AND name = 'hub_type')
BEGIN
    ALTER TABLE hubs ADD hub_type VARCHAR(20) DEFAULT 'SUPER_HUB';
END;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('hubs') AND name = 'parent_hub_code')
BEGIN
    ALTER TABLE hubs ADD parent_hub_code VARCHAR(50) NULL;
END;

-- 2. Cập nhật phân cấp Mạng Nhện cho 5 Hub hiện tại
UPDATE hubs SET hub_type = 'SUPER_HUB', parent_hub_code = NULL WHERE hub_code IN ('HUB-HN-01', 'HUB-DN-01', 'HUB-HCM-01');
UPDATE hubs SET hub_type = 'LOCAL_HUB', parent_hub_code = 'HUB-HN-01' WHERE hub_code = 'HUB-HP-01';
UPDATE hubs SET hub_type = 'LOCAL_HUB', parent_hub_code = 'HUB-HCM-01' WHERE hub_code = 'HUB-CT-01';

-- 3. Tạo bảng quản lý chuyến xe tải (trips)
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'trips')
BEGIN
    CREATE TABLE trips (
        id BIGINT IDENTITY(1,1) PRIMARY KEY,
        trip_code VARCHAR(50) NOT NULL UNIQUE,       -- VD: TRIP-NORTH-SOUTH-01
        route_name NVARCHAR(150) NOT NULL,           -- Tuyến Trục Bắc Nam (HN - ĐN - HCM)
        vehicle_plate VARCHAR(30) NOT NULL,          -- Biển số xe: 29C-888.99
        driver_name NVARCHAR(100) NOT NULL,          -- Tên tài xế
        max_weight_kg FLOAT NOT NULL DEFAULT 5000.0, -- Tải trọng tối đa: 5 tấn
        current_weight_kg FLOAT NOT NULL DEFAULT 0.0,-- Khối lượng hàng hiện tại
        total_shipments INT NOT NULL DEFAULT 0,      -- Tổng số đơn hàng trên xe
        current_hub VARCHAR(50) NOT NULL,            -- Hub xe đang đỗ (VD: HUB-HN-01)
        status VARCHAR(30) NOT NULL DEFAULT 'SCHEDULED', -- SCHEDULED, DEPARTED, ARRIVED_STOP, COMPLETED
        departure_time DATETIME NULL,                -- Thời gian xuất bến
        created_at DATETIME DEFAULT GETDATE()
    );
END;

-- 4. Tạo bảng các trạm dừng của chuyến xe (trip_stops)
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'trip_stops')
BEGIN
    CREATE TABLE trip_stops (
        id BIGINT IDENTITY(1,1) PRIMARY KEY,
        trip_id BIGINT NOT NULL,
        stop_order INT NOT NULL,                     -- 0: Xuất phát, 1: Giữa đường, 2: Đích cuối
        hub_code VARCHAR(50) NOT NULL,               -- HUB-HN-01, HUB-DN-01, HUB-HCM-01
        status VARCHAR(30) NOT NULL DEFAULT 'PENDING', -- PENDING, CURRENT, COMPLETED
        arrived_at DATETIME NULL,
        departed_at DATETIME NULL,
        CONSTRAINT FK_TripStops_Trip FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
    );
END;

-- 5. Tạo bảng kê bưu phẩm gom trên xe (trip_manifests)
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'trip_manifests')
BEGIN
    CREATE TABLE trip_manifests (
        id BIGINT IDENTITY(1,1) PRIMARY KEY,
        trip_id BIGINT NOT NULL,
        tracking_code VARCHAR(50) NOT NULL,          
        origin_hub VARCHAR(50) NOT NULL,             
        destination_hub VARCHAR(50) NOT NULL,        
        weight_kg FLOAT NOT NULL,                    
        service_type VARCHAR(30) NOT NULL,         
        status VARCHAR(30) NOT NULL DEFAULT 'LOADED', 
        loaded_at DATETIME DEFAULT GETDATE(),
        unloaded_at DATETIME NULL,
        CONSTRAINT FK_TripManifest_Trip FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
    );
END;