IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_tracking_code_occurred_at' AND object_id = OBJECT_ID('tracking_history'))
BEGIN
    CREATE NONCLUSTERED INDEX idx_tracking_code_occurred_at ON tracking_history(tracking_code, occurred_at ASC);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_tracking_code_status_occurred' AND object_id = OBJECT_ID('tracking_history'))
BEGIN
    CREATE NONCLUSTERED INDEX idx_tracking_code_status_occurred ON tracking_history(tracking_code, status, occurred_at DESC);
END;
