ALTER TABLE payment_transactions ADD customer_code NVARCHAR(50) NULL;
ALTER TABLE payment_transactions ADD created_by NVARCHAR(100) NULL;

CREATE INDEX idx_payment_customer_code ON payment_transactions(customer_code);
CREATE INDEX idx_payment_created_at ON payment_transactions(created_at);
