IF OBJECT_ID('tracking_history', 'U') IS NULL
BEGIN
    CREATE TABLE tracking_history (
        id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        tracking_code NVARCHAR(100) NOT NULL,
        status NVARCHAR(50) NOT NULL,
        location_code NVARCHAR(100) NOT NULL,
        node NVARCHAR(500) NOT NULL,
        occurred_at DATETIME2 NOT NULL
    );
END;

IF COL_LENGTH('tracking_history', 'event_id') IS NULL
    ALTER TABLE tracking_history ADD event_id NVARCHAR(100) NULL;

IF COL_LENGTH('tracking_history', 'operation_type') IS NULL
    ALTER TABLE tracking_history ADD operation_type NVARCHAR(100) NULL;

IF COL_LENGTH('tracking_history', 'transport_leg') IS NULL
    ALTER TABLE tracking_history ADD transport_leg NVARCHAR(100) NULL;

IF COL_LENGTH('tracking_history', 'trip_code') IS NULL
    ALTER TABLE tracking_history ADD trip_code NVARCHAR(100) NULL;

IF COL_LENGTH('tracking_history', 'actor_id') IS NULL
    ALTER TABLE tracking_history ADD actor_id NVARCHAR(100) NULL;

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'ux_tracking_history_event_id'
      AND object_id = OBJECT_ID('tracking_history')
)
    EXEC(N'CREATE UNIQUE INDEX ux_tracking_history_event_id
        ON tracking_history(event_id)
        WHERE event_id IS NOT NULL');
