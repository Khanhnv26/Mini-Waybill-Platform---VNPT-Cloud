ALTER TABLE shippers ADD shift_status NVARCHAR(20) NOT
NULL CONSTRAINT DF_shippers_shift_status DEFAULT 'ON_DUTY';
ALTER TABLE shippers ADD max_orders_per_shift INT NOT
NULL CONSTRAINT DF_shippers_max_orders DEFAULT 40;
ALTER TABLE shippers ADD current_orders_count INT NOT
NULL CONSTRAINT DF_shippers_current_orders DEFAULT 0;
CREATE INDEX idx_shippers_station_shift ONshippers(station_code, status, shift_status);