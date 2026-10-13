IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_notif_recipient_sent' AND object_id = OBJECT_ID('notification_log'))
BEGIN
    CREATE NONCLUSTERED INDEX idx_notif_recipient_sent ON notification_log(recipient_phone, sent_at DESC);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_notif_recipient_unread' AND object_id = OBJECT_ID('notification_log'))
BEGIN
    CREATE NONCLUSTERED INDEX idx_notif_recipient_unread ON notification_log(recipient_phone, is_read);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_notif_tracking_sent' AND object_id = OBJECT_ID('notification_log'))
BEGIN
    CREATE NONCLUSTERED INDEX idx_notif_tracking_sent ON notification_log(tracking_code, sent_at DESC);
END;
