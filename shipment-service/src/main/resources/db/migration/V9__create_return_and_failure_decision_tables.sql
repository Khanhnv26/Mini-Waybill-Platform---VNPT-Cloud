SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;

IF NOT EXISTS (
    SELECT 1 FROM sys.tables WHERE name = 'return_requests'
)
BEGIN
CREATE TABLE return_requests (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    tracking_code VARCHAR(50) NOT NULL,
    customer_id BIGINT NOT NULL,
    initiator VARCHAR(30) NOT NULL,
    reason_code VARCHAR(50) NOT NULL,
    reason_note NVARCHAR(500) NULL,
    return_mode VARCHAR(30) NOT NULL,
    status VARCHAR(30) NOT NULL CONSTRAINT DF_return_requests_status DEFAULT 'PENDING',
    postal_fault BIT NOT NULL CONSTRAINT DF_return_requests_postal_fault DEFAULT 0,
    return_fee DECIMAL(18,2) NOT NULL CONSTRAINT DF_return_requests_return_fee DEFAULT 0,
    fee_payment_status VARCHAR(30) NOT NULL CONSTRAINT DF_return_requests_fee_payment_status DEFAULT 'UNPAID',
    arrived_origin_at DATETIME2 NULL,
    pickup_deadline DATETIME2 NULL,
    requested_by VARCHAR(100) NULL,
    created_at DATETIME2 NOT NULL CONSTRAINT DF_return_requests_created_at DEFAULT GETDATE(),
    updated_at DATETIME2 NOT NULL CONSTRAINT DF_return_requests_updated_at DEFAULT GETDATE()
);

CREATE INDEX idx_return_requests_tracking_code ON return_requests(tracking_code);
CREATE INDEX idx_return_requests_customer_id ON return_requests(customer_id);
CREATE INDEX idx_return_requests_status ON return_requests(status);
END;

IF NOT EXISTS (
    SELECT 1 FROM sys.tables WHERE name = 'delivery_failure_decisions'
)
BEGIN
CREATE TABLE delivery_failure_decisions (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    tracking_code VARCHAR(50) NOT NULL,
    customer_id BIGINT NOT NULL,
    attempt_no INT NOT NULL CONSTRAINT DF_deliv_fail_attempt DEFAULT 1,
    failed_at DATETIME2 NOT NULL,
    decision_deadline DATETIME2 NOT NULL,
    failure_reason NVARCHAR(255) NULL,
    decision VARCHAR(30) NOT NULL CONSTRAINT DF_deliv_fail_decision DEFAULT 'PENDING',
    preferred_date DATE NULL,
    decision_note NVARCHAR(500) NULL,
    new_receiver_phone VARCHAR(20) NULL,
    new_receiver_address NVARCHAR(255) NULL,
    decided_at DATETIME2 NULL,
    created_at DATETIME2 NOT NULL CONSTRAINT DF_deliv_fail_created_at DEFAULT GETDATE(),
    updated_at DATETIME2 NOT NULL CONSTRAINT DF_deliv_fail_updated_at DEFAULT GETDATE()
);

CREATE INDEX idx_failure_decisions_tracking_code ON delivery_failure_decisions(tracking_code);
CREATE INDEX idx_failure_decisions_customer_id ON delivery_failure_decisions(customer_id);
CREATE INDEX idx_failure_decisions_status ON delivery_failure_decisions(decision, decision_deadline);
END;
