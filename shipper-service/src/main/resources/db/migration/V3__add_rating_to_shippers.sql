IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('shippers') AND name = 'rating_avg')
BEGIN
ALTER TABLE shippers ADD rating_avg FLOAT NULL CONSTRAINT DF_shippers_rating_avg DEFAULT 5.0;
END;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('shippers') AND name = 'rating_count')
BEGIN
ALTER TABLE shippers ADD rating_count INT NULL CONSTRAINT DF_shippers_rating_count DEFAULT 0;
END;
