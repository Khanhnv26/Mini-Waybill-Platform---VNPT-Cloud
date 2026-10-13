IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_routing_tracking_code' AND object_id = OBJECT_ID('routing'))
BEGIN
    CREATE NONCLUSTERED INDEX idx_routing_tracking_code ON routing(tracking_code);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_routing_dest_status' AND object_id = OBJECT_ID('routing'))
BEGIN
    CREATE NONCLUSTERED INDEX idx_routing_dest_status ON routing(dest_post_office, status);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_routing_status' AND object_id = OBJECT_ID('routing'))
BEGIN
    CREATE NONCLUSTERED INDEX idx_routing_status ON routing(status);
END;
