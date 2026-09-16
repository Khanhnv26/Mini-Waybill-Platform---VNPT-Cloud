INSERT INTO shippers (courier_code, full_name, phone, telegram_chat_id, station_code, status, created_at)
SELECT v.courier_code, v.full_name, v.phone, NULL, v.station_code, 'ACTIVE', GETDATE()
FROM (VALUES
    (N'BT-HN-CG-01',   N'Nguyễn Văn Nam',  N'0912.345.678', N'POST-HN-CG'),
    (N'BT-HN-CG-02',   N'Đỗ Văn Hùng',     N'0912.345.679', N'POST-HN-CG'),
    (N'BT-HN-DDA-01',  N'Lê Văn Cường',    N'0912.345.680', N'POST-HN-DDA'),
    (N'BT-HN-HBT-01',  N'Trần Văn Mạnh',   N'0912.345.681', N'POST-HN-HBT'),
    (N'BT-HN-TX-01',   N'Vũ Văn Long',     N'0912.345.682', N'POST-HN-TX'),
    (N'BT-HN-HD-01',   N'Bùi Văn Tuấn',    N'0912.345.683', N'POST-HN-HD'),
    (N'BT-DN-HC-01',   N'Phan Văn Sơn',    N'0913.456.789', N'POST-DN-HC'),
    (N'BT-DN-TK-01',   N'Ngô Văn Đức',     N'0913.456.790', N'POST-DN-TK'),
    (N'BT-DN-ST-01',   N'Hoàng Văn Thái',  N'0913.456.791', N'POST-DN-ST'),
    (N'BT-HCM-Q1-01',  N'Nguyễn Văn Phát', N'0918.765.432', N'POST-HCM-Q1'),
    (N'BT-HCM-Q1-02',  N'Trần Thanh Bình', N'0918.765.433', N'POST-HCM-Q1'),
    (N'BT-HCM-TB-01',  N'Phạm Văn Minh',   N'0918.765.434', N'POST-HCM-TB'),
    (N'BT-HCM-BT-01',  N'Đặng Văn Khoa',   N'0918.765.435', N'POST-HCM-BT'),
    (N'BT-HCM-TD-01',  N'Trịnh Văn Sang',  N'0918.765.436', N'POST-HCM-TD'),
    (N'BT-HCM-Q7-01',  N'Lý Văn Hải',      N'0918.765.437', N'POST-HCM-Q7'),
    (N'shipper@waybill.vn', N'Trần Văn Phát (Bưu Tá)', N'0909.000.999', N'ALL')
) AS v(courier_code, full_name, phone, station_code)
WHERE NOT EXISTS (SELECT 1 FROM shippers s WHERE s.courier_code = v.courier_code);