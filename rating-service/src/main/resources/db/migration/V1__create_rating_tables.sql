IF OBJECT_ID('shipment_ratings', 'U') IS NULL
BEGIN
    CREATE TABLE shipment_ratings (
        id                      BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        tracking_code           NVARCHAR(50)         NOT NULL,
        courier_code            NVARCHAR(50)         NULL,
        service_rating          INT                  NOT NULL,
        shipper_rating          INT                  NOT NULL,
        tags                    NVARCHAR(500)        NULL,
        comment                 NVARCHAR(MAX)        NULL,
        attachment_urls         NVARCHAR(MAX)        NULL,
        verified_phone          NVARCHAR(10)         NULL,
        created_at              DATETIME2            NOT NULL CONSTRAINT DF_ratings_created_at DEFAULT SYSDATETIME(),
        CONSTRAINT uq_shipment_ratings_tracking UNIQUE (tracking_code)
    );

    CREATE INDEX idx_ratings_tracking_code ON shipment_ratings(tracking_code);
    CREATE INDEX idx_ratings_courier_code ON shipment_ratings(courier_code);
END;
