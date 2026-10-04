-- Seed Feeder Vehicles (Xe tải nhẹ gom hàng nội đô & trung chuyển) cho các Bưu Cục cấp 2/3
IF NOT EXISTS (SELECT 1 FROM vehicles WHERE vehicle_plate = '29C-556.12')
BEGIN
    INSERT INTO vehicles (vehicle_plate, model_name, vehicle_type, payload_capacity_kg, current_hub, status, assigned_driver_name, driver_phone)
    VALUES
        ('29C-556.12', N'Kia K250 1.5T', 'TRUCK_1_5T', 1500.0, 'POST-HN-CG', 'AVAILABLE', N'Vũ Văn Gom', '0912.556.123'),
        ('29C-667.89', N'Suzuki Carry Pro 1.0T', 'TRUCK_1_5T', 1000.0, 'POST-HN-DDA', 'AVAILABLE', N'Trần Văn Thu', '0912.667.890'),
        ('29C-889.01', N'Hyundai Porter 1.5T', 'TRUCK_1_5T', 1500.0, 'POST-HN-HBT', 'AVAILABLE', N'Lê Minh Gom', '0912.889.012'),
        ('43C-332.11', N'Hyundai Porter 1.5T', 'TRUCK_1_5T', 1500.0, 'POST-DN-HC', 'AVAILABLE', N'Phan Văn Gom', '0913.332.112'),
        ('43C-445.77', N'Kia K250 1.5T', 'TRUCK_1_5T', 1500.0, 'POST-DN-TK', 'AVAILABLE', N'Đỗ Hùng Thu', '0913.445.778'),
        ('51D-445.66', N'Isuzu QKR 2.5T', 'TRUCK_2_5T', 2500.0, 'POST-HCM-Q1', 'AVAILABLE', N'Huỳnh Văn Lượm', '0918.445.667'),
        ('51D-778.22', N'Kia K250 1.5T', 'TRUCK_1_5T', 1500.0, 'POST-HCM-TB', 'AVAILABLE', N'Lê Minh Phát', '0918.778.223'),
        ('51D-889.33', N'Hyundai Mighty 2.5T', 'TRUCK_2_5T', 2500.0, 'POST-HCM-BT', 'AVAILABLE', N'Nguyễn Tấn Gom', '0918.889.334');
END;
