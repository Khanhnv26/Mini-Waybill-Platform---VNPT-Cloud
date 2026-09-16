IF OBJECT_ID('shippers', 'U') IS NULL
BEGIN
    CREATE TABLE shippers (
        id               BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        courier_code     NVARCHAR(100) NOT NULL,
        full_name        NVARCHAR(255) NOT NULL,
        phone            NVARCHAR(20)  NULL,
        telegram_chat_id NVARCHAR(100) NULL,
        station_code     NVARCHAR(50)  NULL,
        status           NVARCHAR(20)  NOT NULL CONSTRAINT DF_shippers_status DEFAULT 'ACTIVE',
        created_at       DATETIME2     NULL,
        CONSTRAINT uq_shippers_courier_code UNIQUE (courier_code)
    );
END;