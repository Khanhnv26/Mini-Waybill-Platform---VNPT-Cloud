ALTER TABLE shipments
    ADD COLUMN estimated_delivery_at TIMESTAMP NULL,
    ADD COLUMN estimated_delivery_max TIMESTAMP NULL,
    ADD COLUMN assigned_trip_code VARCHAR(50) NULL;

CREATE INDEX idx_shipments_assigned_trip ON
    shipments(assigned_trip_code);