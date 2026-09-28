CREATE TABLE payment_transactions (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    payment_code NVARCHAR(64) NOT NULL UNIQUE,
    tracking_code NVARCHAR(50) NOT NULL,
    amount DECIMAL(18,2) NOT NULL,
    payment_type NVARCHAR(30) NOT NULL,
    payment_method NVARCHAR(30) NOT NULL,
    status NVARCHAR(30) NOT NULL DEFAULT 'PENDING',
    qr_url NVARCHAR(500) NULL,
    bank_code NVARCHAR(20) NULL,
    account_no NVARCHAR(50) NULL,
    reference_code NVARCHAR(100) NULL,
    payer_note NVARCHAR(255) NULL,
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    paid_at DATETIME2 NULL,
    updated_at DATETIME2 NOT NULL DEFAULT GETDATE()
);

CREATE INDEX idx_payment_tracking_code ON payment_transactions(tracking_code);
CREATE INDEX idx_payment_status ON payment_transactions(status);

CREATE TABLE payment_webhook_logs (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    gateway_name NVARCHAR(50) NOT NULL,
    raw_payload NVARCHAR(MAX) NOT NULL,
    signature NVARCHAR(255) NULL,
    is_processed BIT NOT NULL DEFAULT 0,
    error_message NVARCHAR(500) NULL,
    received_at DATETIME2 NOT NULL DEFAULT GETDATE()
);
