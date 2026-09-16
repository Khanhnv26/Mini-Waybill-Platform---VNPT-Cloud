IF OBJECT_ID('notification_log', 'U') IS NULL
BEGIN
    CREATE TABLE notification_log (
        id              BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        tracking_code   NVARCHAR(255) NOT NULL,
        recipient_phone NVARCHAR(255) NOT NULL,
        type            NVARCHAR(255) NOT NULL,
        title           NVARCHAR(255) NOT NULL,
        message         NVARCHAR(1000) NOT NULL,
        status          NVARCHAR(255) NOT NULL,
        sent_at         DATETIME2 NOT NULL
    );
END;