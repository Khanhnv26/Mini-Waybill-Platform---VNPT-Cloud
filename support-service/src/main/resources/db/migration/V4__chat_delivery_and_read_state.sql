-- Flyway's SQL Server delimiter is GO. A semicolon does not start a new batch:
-- finish ALTER TABLE before SQL Server compiles indexes using the added columns.
ALTER TABLE ticket_messages ADD client_message_id VARCHAR(64) NULL, sender_key VARCHAR(80) NULL, audience_key VARCHAR(80) NULL;
GO

CREATE UNIQUE INDEX UX_chat_client_message ON ticket_messages(ticket_id, client_message_id) WHERE client_message_id IS NOT NULL;
CREATE INDEX IX_chat_history ON ticket_messages(ticket_id, id);
CREATE INDEX IX_chat_audience ON ticket_messages(audience_key, id);
GO

CREATE TABLE support_chat_read_state (
    id VARCHAR(120) NOT NULL PRIMARY KEY,
    ticket_id BIGINT NOT NULL,
    reader_key VARCHAR(80) NOT NULL,
    staff BIT NOT NULL,
    last_read_message_id BIGINT NOT NULL DEFAULT 0,
    notification_read_message_id BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT FK_chat_read_ticket FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE,
    CONSTRAINT UX_chat_reader UNIQUE(ticket_id, reader_key)
);
GO

CREATE INDEX IX_chat_read_ticket ON support_chat_read_state(ticket_id);
GO
