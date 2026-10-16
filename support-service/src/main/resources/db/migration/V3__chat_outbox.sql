CREATE TABLE support_chat_outbox (
    message_id BIGINT NOT NULL PRIMARY KEY,
    delivered BIT NOT NULL DEFAULT 0,
    next_attempt_at DATETIME2 NOT NULL,
    CONSTRAINT FK_chat_outbox_message FOREIGN KEY (message_id) REFERENCES ticket_messages(id)
);
CREATE INDEX IX_chat_outbox_pending ON support_chat_outbox(delivered, next_attempt_at);
