IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_audit_aggregate_occurred' AND object_id = OBJECT_ID('audit_events'))
BEGIN
    CREATE NONCLUSTERED INDEX idx_audit_aggregate_occurred ON audit_events(aggregate_id, occurred_at ASC);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_audit_occurred_at' AND object_id = OBJECT_ID('audit_events'))
BEGIN
    CREATE NONCLUSTERED INDEX idx_audit_occurred_at ON audit_events(occurred_at DESC);
END;
