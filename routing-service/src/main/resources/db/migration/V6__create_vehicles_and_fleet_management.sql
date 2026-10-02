IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name =
  'vehicles')
BEGIN
CREATE TABLE vehicles (
                          id BIGINT IDENTITY(1,1) PRIMARY KEY,
                          vehicle_plate VARCHAR(30) NOT NULL UNIQUE,
                          model_name NVARCHAR(100) NOT NULL,
                          vehicle_type VARCHAR(30) NOT NULL,
                          payload_capacity_kg FLOAT NOT NULL DEFAULT 2500.0,
                          current_hub VARCHAR(50) NOT NULL,
                          status VARCHAR(30) NOT NULL DEFAULT 'AVAILABLE',
                          assigned_driver_name NVARCHAR(100) NULL,
                          driver_phone VARCHAR(20) NULL,
                          created_at DATETIME2 DEFAULT GETDATE()
);

CREATE INDEX idx_vehicles_hub_status ON
    vehicles(current_hub, status);
END;

    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id =
  OBJECT_ID('trips') AND name = 'vehicle_id')
BEGIN
ALTER TABLE trips ADD vehicle_id BIGINT NULL;
ALTER TABLE trips ADD CONSTRAINT FK_Trips_Vehicles
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id);
END;

INSERT INTO vehicles (vehicle_plate, model_name,
                      vehicle_type, payload_capacity_kg, current_hub, status,
                      assigned_driver_name, driver_phone)
VALUES
    ('29H-882.11', N'Hyundai Mighty 2.5T', 'TRUCK_2_5T',
     2500.0, 'HUB-HN-01', 'AVAILABLE', N'Nguyễn Văn Toàn', '0912.
  111.222'),
    ('29C-551.40', N'Isuzu Forward 5.0T',  'TRUCK_5T',
     5000.0, 'HUB-HN-01', 'AVAILABLE', N'Trần Văn Long',  '0912.
  333.444'),
    ('29D-123.88', N'Kia K250 1.5T',        'TRUCK_1_5T',
     1500.0, 'HUB-HN-01', 'MAINTENANCE', N'Lê Văn Tâm',    '0912.
  555.666'),
    ('43C-772.19', N'Hino 300 3.5T',        'TRUCK_3_5T',
     3500.0, 'HUB-DN-01', 'AVAILABLE', N'Hoàng Văn Nam', '0913.
  666.777'),
    ('51D-998.01', N'Isuzu Giga 15T',       'CONTAINER',
     15000.0, 'HUB-HCM-01', 'AVAILABLE', N'Phạm Văn Hùng', '0918.
  888.999'),
    ('51C-663.22', N'Hyundai Mighty 2.5T', 'TRUCK_2_5T',
     2500.0, 'HUB-HCM-01', 'ON_TRIP',   N'Đặng Văn Bình',  '0918.
  999.000');