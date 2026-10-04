IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('shippers') AND name = 'shift_status')
BEGIN
    ALTER TABLE shippers ADD shift_status NVARCHAR(20) NOT NULL CONSTRAINT DF_shippers_shift_status DEFAULT 'ON_DUTY';
END;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('shippers') AND name = 'max_orders_per_shift')
BEGIN
    ALTER TABLE shippers ADD max_orders_per_shift INT NOT NULL CONSTRAINT DF_shippers_max_orders DEFAULT 40;
END;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('shippers') AND name = 'current_orders_count')
BEGIN
    ALTER TABLE shippers ADD current_orders_count INT NOT NULL CONSTRAINT DF_shippers_current_orders DEFAULT 0;
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_shippers_station_shift' AND object_id = OBJECT_ID('shippers'))
BEGIN
    CREATE INDEX idx_shippers_station_shift ON shippers(station_code, status, shift_status);
END;