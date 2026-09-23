-- ==============================================================================
-- FLYWAY MIGRATION V1: Khởi tạo bảng dữ liệu cho Support & Khiếu nại
-- Hệ quản trị CSDL: Microsoft SQL Server
-- ==============================================================================

IF OBJECT_ID('support_tickets', 'U') IS NULL
BEGIN
    CREATE TABLE support_tickets (
        id                  BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        ticket_code         NVARCHAR(50)         NOT NULL,
        tracking_code       NVARCHAR(50)         NULL,
        creator_user_id     BIGINT               NOT NULL,
        creator_name        NVARCHAR(100)        NOT NULL,
        creator_phone       NVARCHAR(20)         NOT NULL,
        creator_email       NVARCHAR(100)        NULL,
        category            NVARCHAR(40)         NOT NULL,
        priority            NVARCHAR(20)         NOT NULL CONSTRAINT DF_tickets_priority DEFAULT 'NORMAL',
        status              NVARCHAR(30)         NOT NULL CONSTRAINT DF_tickets_status DEFAULT 'OPEN',
        title               NVARCHAR(255)        NOT NULL,
        description         NVARCHAR(MAX)        NOT NULL,
        compensation_amount DECIMAL(18,2)        NOT NULL CONSTRAINT DF_tickets_compensation DEFAULT 0,
        assigned_to_user_id BIGINT               NULL,
        assigned_to_name    NVARCHAR(100)        NULL,
        resolution_note     NVARCHAR(MAX)        NULL,
        created_at          DATETIME2            NOT NULL CONSTRAINT DF_tickets_created_at DEFAULT SYSDATETIME(),
        updated_at          DATETIME2            NOT NULL CONSTRAINT DF_tickets_updated_at DEFAULT SYSDATETIME(),
        closed_at           DATETIME2            NULL,
        CONSTRAINT uq_support_tickets_code UNIQUE (ticket_code)
    );

    CREATE INDEX idx_tickets_tracking_code ON support_tickets(tracking_code);
    CREATE INDEX idx_tickets_status ON support_tickets(status);
    CREATE INDEX idx_tickets_creator ON support_tickets(creator_user_id);
END;

IF OBJECT_ID('ticket_messages', 'U') IS NULL
BEGIN
    CREATE TABLE ticket_messages (
        id              BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        ticket_id       BIGINT               NOT NULL,
        sender_id       BIGINT               NOT NULL,
        sender_name     NVARCHAR(100)        NOT NULL,
        sender_role     NVARCHAR(30)         NOT NULL,
        content         NVARCHAR(MAX)        NOT NULL,
        attachment_urls NVARCHAR(MAX)        NULL,
        created_at      DATETIME2            NOT NULL CONSTRAINT DF_ticket_messages_created_at DEFAULT SYSDATETIME(),
        CONSTRAINT fk_ticket_messages_ticket FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE
    );

    CREATE INDEX idx_ticket_messages_ticket_id ON ticket_messages(ticket_id);
END;
