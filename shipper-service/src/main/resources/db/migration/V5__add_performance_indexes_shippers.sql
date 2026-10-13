IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_shippers_telegram_chat_id' AND object_id = OBJECT_ID('shippers'))
BEGIN
    CREATE NONCLUSTERED INDEX idx_shippers_telegram_chat_id ON shippers(telegram_chat_id);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_shippers_phone' AND object_id = OBJECT_ID('shippers'))
BEGIN
    CREATE NONCLUSTERED INDEX idx_shippers_phone ON shippers(phone);
END;
