IF NOT EXISTS (
    SELECT 1 FROM sys.columns 
    WHERE object_id = OBJECT_ID('shipment_ratings') AND name = 'is_hidden'
)
BEGIN
    ALTER TABLE shipment_ratings ADD is_hidden BIT NOT NULL CONSTRAINT DF_ratings_is_hidden DEFAULT 0;
END;

IF NOT EXISTS (
    SELECT 1 FROM sys.columns 
    WHERE object_id = OBJECT_ID('shipment_ratings') AND name = 'hidden_reason'
)
BEGIN
    ALTER TABLE shipment_ratings ADD hidden_reason NVARCHAR(500) NULL;
END;

IF NOT EXISTS (
    SELECT 1 FROM sys.columns 
    WHERE object_id = OBJECT_ID('shipment_ratings') AND name = 'hidden_by'
)
BEGIN
    ALTER TABLE shipment_ratings ADD hidden_by NVARCHAR(100) NULL;
END;

IF NOT EXISTS (
    SELECT 1 FROM sys.columns 
    WHERE object_id = OBJECT_ID('shipment_ratings') AND name = 'hidden_at'
)
BEGIN
    ALTER TABLE shipment_ratings ADD hidden_at DATETIME2 NULL;
END;

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes 
    WHERE object_id = OBJECT_ID('shipment_ratings') AND name = 'idx_ratings_is_hidden'
)
BEGIN
    CREATE INDEX idx_ratings_is_hidden ON shipment_ratings(is_hidden);
END;
