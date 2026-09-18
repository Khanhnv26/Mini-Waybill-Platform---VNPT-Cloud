-- =========================================================================
-- SHIPMENT-SERVICE MIGRATION: V5
-- Bổ sung các trường quản lý quyết toán nộp quỹ COD bưu tá và bưu cục
-- =========================================================================
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;

IF NOT EXISTS (
    SELECT 1 FROM sys.columns 
    WHERE object_id = OBJECT_ID('shipments') AND name = 'cod_settlement_status'
)
BEGIN
    ALTER TABLE shipments ADD cod_settlement_status VARCHAR(50) NOT NULL CONSTRAINT DF_shipments_cod_settlement_status DEFAULT 'UNSETTLED';
END;

IF NOT EXISTS (
    SELECT 1 FROM sys.columns 
    WHERE object_id = OBJECT_ID('shipments') AND name = 'cod_settled_at'
)
BEGIN
    ALTER TABLE shipments ADD cod_settled_at DATETIME2 NULL;
END;

IF NOT EXISTS (
    SELECT 1 FROM sys.columns 
    WHERE object_id = OBJECT_ID('shipments') AND name = 'cod_settled_by'
)
BEGIN
    ALTER TABLE shipments ADD cod_settled_by NVARCHAR(100) NULL;
END;
