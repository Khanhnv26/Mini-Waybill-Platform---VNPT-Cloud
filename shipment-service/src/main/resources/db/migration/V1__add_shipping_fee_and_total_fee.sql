-- Migration: Add shipping_fee and total_fee to shipments table
IF NOT EXISTS (
    SELECT 1 FROM sys.columns 
    WHERE object_id = OBJECT_ID('shipments') AND name = 'shipping_fee'
)
BEGIN
    ALTER TABLE shipments 
    ADD shipping_fee DECIMAL(18, 2) NOT NULL CONSTRAINT DF_shipments_shipping_fee DEFAULT 0;
END;

IF NOT EXISTS (
    SELECT 1 FROM sys.columns 
    WHERE object_id = OBJECT_ID('shipments') AND name = 'total_fee'
)
BEGIN
    ALTER TABLE shipments 
    ADD total_fee DECIMAL(18, 2) NOT NULL CONSTRAINT DF_shipments_total_fee DEFAULT 0;
END;
