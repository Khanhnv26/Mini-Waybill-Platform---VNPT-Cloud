-- =========================================================================
-- FLYWAY MIGRATION V2: THỜI GIAN XUẤT BẾN & CẤU HÌNH BỘ LẬP LỊCH CHUYẾN XE
-- CƠ SỞ DỮ LIỆU: routing_db
-- =========================================================================

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('trips') AND name = 'scheduled_departure_time')
BEGIN
    ALTER TABLE trips ADD scheduled_departure_time DATETIME NULL;
END;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('trips') AND name = 'cutoff_time')
BEGIN
    ALTER TABLE trips ADD cutoff_time DATETIME NULL;
END;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('trips') AND name = 'ready_to_depart')
BEGIN
    ALTER TABLE trips ADD ready_to_depart BIT DEFAULT 0;
END;

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'scheduler_config')
BEGIN
    CREATE TABLE scheduler_config (
        id BIGINT IDENTITY(1,1) PRIMARY KEY,
        enabled BIT NOT NULL DEFAULT 1,
        interval_seconds BIGINT NOT NULL DEFAULT 300,
        fixed_cron_times VARCHAR(255) DEFAULT '08:00,12:00,18:00,22:00',
        ready_threshold_percent FLOAT NOT NULL DEFAULT 80.0,
        cutoff_buffer_minutes INT NOT NULL DEFAULT 30,
        last_run_time DATETIME NULL,
        last_consolidated_count INT NOT NULL DEFAULT 0,
        updated_at DATETIME DEFAULT GETDATE()
    );

    INSERT INTO scheduler_config (enabled, interval_seconds, fixed_cron_times, ready_threshold_percent, cutoff_buffer_minutes, last_consolidated_count)
    VALUES (1, 300, '08:00,12:00,18:00,22:00', 80.0, 30, 0);
END;
