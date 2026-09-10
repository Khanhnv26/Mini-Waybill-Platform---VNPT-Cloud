-- Coordinates are optional because historical shipments were created before address verification.
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('shipments') AND name = 'sender_latitude')
BEGIN
    ALTER TABLE shipments ADD sender_latitude FLOAT NULL;
END;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('shipments') AND name = 'sender_longitude')
BEGIN
    ALTER TABLE shipments ADD sender_longitude FLOAT NULL;
END;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('shipments') AND name = 'receiver_latitude')
BEGIN
    ALTER TABLE shipments ADD receiver_latitude FLOAT NULL;
END;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('shipments') AND name = 'receiver_longitude')
BEGIN
    ALTER TABLE shipments ADD receiver_longitude FLOAT NULL;
END;
