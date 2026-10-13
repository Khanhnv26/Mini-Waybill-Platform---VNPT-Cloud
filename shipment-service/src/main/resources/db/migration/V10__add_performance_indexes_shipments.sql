IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_shipments_customer_created' AND object_id = OBJECT_ID('shipments'))
BEGIN
    CREATE NONCLUSTERED INDEX idx_shipments_customer_created ON shipments(customer_id, created_at DESC);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_shipments_status_created' AND object_id = OBJECT_ID('shipments'))
BEGIN
    CREATE NONCLUSTERED INDEX idx_shipments_status_created ON shipments(current_status, created_at DESC);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_shipments_created_at' AND object_id = OBJECT_ID('shipments'))
BEGIN
    CREATE NONCLUSTERED INDEX idx_shipments_created_at ON shipments(created_at DESC);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_shipments_cod_settlement' AND object_id = OBJECT_ID('shipments'))
BEGIN
    CREATE NONCLUSTERED INDEX idx_shipments_cod_settlement ON shipments(cod_settlement_status, created_at);
END;
