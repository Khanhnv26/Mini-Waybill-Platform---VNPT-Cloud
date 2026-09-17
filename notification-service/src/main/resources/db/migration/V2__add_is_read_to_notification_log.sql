IF NOT EXISTS (
    SELECT 1 
    FROM sys.columns 
    WHERE object_id = OBJECT_ID('notification_log') 
      AND name = 'is_read'
)
BEGIN
    ALTER TABLE notification_log 
    ADD is_read BIT NOT NULL CONSTRAINT DF_notification_log_is_read DEFAULT 0;
END;
