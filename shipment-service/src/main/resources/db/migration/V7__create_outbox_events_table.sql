SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;

IF NOT EXISTS (
    SELECT 1 FROM sys.tables WHERE name = 'outbox_events'
)
BEGIN
CREATE TABLE outbox_events (
                               id BIGINT IDENTITY(1,1) PRIMARY KEY,
                               aggregate_type VARCHAR(50) NOT NULL,
                               aggregate_id VARCHAR(100) NOT NULL,
                               event_type VARCHAR(100) NOT NULL,
                               payload NVARCHAR(MAX) NOT NULL,
                               status VARCHAR(20) NOT NULL CONSTRAINT DF_outbox_events_status DEFAULT 'PENDING',
                               created_at DATETIME2 NOT NULL CONSTRAINT DF_outbox_events_created_at DEFAULT GETDATE(),
                               processed_at DATETIME2 NULL
);

CREATE INDEX idx_outbox_status_created ON outbox_events(status, created_at);
END;