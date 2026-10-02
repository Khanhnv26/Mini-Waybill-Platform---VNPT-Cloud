IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('shipments') AND name = 'estimated_delivery_at')
BEGIN
    ALTER TABLE shipments ADD estimated_delivery_at DATETIME2 NULL;
END;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('shipments') AND name = 'estimated_delivery_max')
BEGIN
    ALTER TABLE shipments ADD estimated_delivery_max DATETIME2 NULL;
END;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('shipments') AND name = 'assigned_trip_code')
BEGIN
    ALTER TABLE shipments ADD assigned_trip_code VARCHAR(50) NULL;
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_shipments_assigned_trip' AND object_id = OBJECT_ID('shipments'))
BEGIN
    CREATE INDEX idx_shipments_assigned_trip ON shipments(assigned_trip_code);
END;