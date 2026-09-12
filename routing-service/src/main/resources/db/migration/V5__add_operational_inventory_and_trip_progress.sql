IF COL_LENGTH('trips', 'trip_type') IS NULL
    ALTER TABLE trips ADD trip_type VARCHAR(30) NULL;

IF COL_LENGTH('trips', 'current_latitude') IS NULL
    ALTER TABLE trips ADD current_latitude FLOAT NULL;

IF COL_LENGTH('trips', 'current_longitude') IS NULL
    ALTER TABLE trips ADD current_longitude FLOAT NULL;

IF COL_LENGTH('trips', 'last_progress_at') IS NULL
    ALTER TABLE trips ADD last_progress_at DATETIME2 NULL;

IF COL_LENGTH('trips', 'progress_percent') IS NULL
    ALTER TABLE trips ADD progress_percent FLOAT NULL;

IF COL_LENGTH('trip_manifests', 'pickup_location_code') IS NULL
    ALTER TABLE trip_manifests ADD pickup_location_code VARCHAR(50) NULL;

IF COL_LENGTH('trip_manifests', 'dropoff_location_code') IS NULL
    ALTER TABLE trip_manifests ADD dropoff_location_code VARCHAR(50) NULL;

IF COL_LENGTH('trip_manifests', 'transport_leg') IS NULL
    ALTER TABLE trip_manifests ADD transport_leg VARCHAR(30) NULL;

IF OBJECT_ID('warehouse_inventory', 'U') IS NULL
BEGIN
    CREATE TABLE warehouse_inventory (
        id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        tracking_code VARCHAR(50) NOT NULL,
        location_code VARCHAR(50) NOT NULL,
        inventory_status VARCHAR(30) NOT NULL DEFAULT 'RECEIVED',
        transport_leg VARCHAR(30) NULL,
        active_trip_id BIGINT NULL,
        received_at DATETIME2 NULL,
        stored_at DATETIME2 NULL,
        reserved_at DATETIME2 NULL,
        loaded_at DATETIME2 NULL,
        updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        version BIGINT NOT NULL DEFAULT 0,
        CONSTRAINT uk_inventory_tracking_code UNIQUE (tracking_code)
    );
END;

IF OBJECT_ID('handling_events', 'U') IS NULL
BEGIN
    CREATE TABLE handling_events (
        id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        operation_id VARCHAR(100) NOT NULL,
        tracking_code VARCHAR(50) NOT NULL,
        operation_type VARCHAR(50) NOT NULL,
        transport_leg VARCHAR(30) NULL,
        location_code VARCHAR(50) NOT NULL,
        trip_code VARCHAR(50) NULL,
        actor_id VARCHAR(100) NULL,
        note NVARCHAR(1000) NULL,
        occurred_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        CONSTRAINT uk_handling_operation_id UNIQUE (operation_id)
    );
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'ix_inventory_location_status' AND object_id = OBJECT_ID('warehouse_inventory'))
    CREATE INDEX ix_inventory_location_status ON warehouse_inventory(location_code, inventory_status);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'ix_handling_tracking_occurred' AND object_id = OBJECT_ID('handling_events'))
    CREATE INDEX ix_handling_tracking_occurred ON handling_events(tracking_code, occurred_at);
