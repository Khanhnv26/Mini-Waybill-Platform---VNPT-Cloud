-- Canonical operational addresses for all routing hubs and post offices.
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('hubs') AND name = 'address')
BEGIN
    ALTER TABLE hubs ADD address NVARCHAR(255) NULL;
END;
GO

UPDATE hubs SET address = N'Lô 12-A, KCN Minh Khai, Phường Minh Khai, Quận Bắc Từ Liêm, Hà Nội' WHERE hub_code = 'HUB-HN-01';
UPDATE hubs SET address = N'Số 5 Đường Lê Hồng Phong, Phường Đằng Lâm, Quận Hải An, Hải Phòng' WHERE hub_code = 'HUB-HP-01';
UPDATE hubs SET address = N'Đường số 3, KCN Hòa Khánh, Phường Hòa Khánh Bắc, Quận Liên Chiểu, Đà Nẵng' WHERE hub_code = 'HUB-DN-01';
UPDATE hubs SET address = N'Số 270 Lý Thường Kiệt, Phường 6, Quận Tân Bình, TP. Hồ Chí Minh' WHERE hub_code = 'HUB-HCM-01';
UPDATE hubs SET address = N'KCN Hưng Phú 1, Phường Hưng Phú, Quận Cái Răng, Cần Thơ' WHERE hub_code = 'HUB-CT-01';

UPDATE hubs SET address = N'Số 165 Cầu Giấy, Phường Dịch Vọng, Quận Cầu Giấy, Hà Nội' WHERE hub_code = 'POST-HN-CG';
UPDATE hubs SET address = N'Số 36 Tây Sơn, Phường Quang Trung, Quận Đống Đa, Hà Nội' WHERE hub_code = 'POST-HN-DDA';
UPDATE hubs SET address = N'Số 236 Lạc Trung, Phường Vĩnh Tuy, Quận Hai Bà Trưng, Hà Nội' WHERE hub_code = 'POST-HN-HBT';
UPDATE hubs SET address = N'Số 18 Nguyễn Trãi, Phường Thượng Đình, Quận Thanh Xuân, Hà Nội' WHERE hub_code = 'POST-HN-TX';
UPDATE hubs SET address = N'Số 4 Quang Trung, Phường Yết Kiêu, Quận Hà Đông, Hà Nội' WHERE hub_code = 'POST-HN-HD';

UPDATE hubs SET address = N'Số 2 Công Xã Paris, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh' WHERE hub_code = 'POST-HCM-Q1';
UPDATE hubs SET address = N'Số 288 Hoàng Văn Thụ, Phường 4, Quận Tân Bình, TP. Hồ Chí Minh' WHERE hub_code = 'POST-HCM-TB';
UPDATE hubs SET address = N'Số 364 Bạch Đằng, Phường 14, Quận Bình Thạnh, TP. Hồ Chí Minh' WHERE hub_code = 'POST-HCM-BT';
UPDATE hubs SET address = N'Số 128 Võ Văn Ngân, Phường Linh Chiểu, TP. Thủ Đức, TP. Hồ Chí Minh' WHERE hub_code = 'POST-HCM-TD';
UPDATE hubs SET address = N'Số 1441 Huỳnh Tấn Phát, Phường Phú Mỹ, Quận 7, TP. Hồ Chí Minh' WHERE hub_code = 'POST-HCM-Q7';

UPDATE hubs SET address = N'Số 4 Lê Duẩn, Phường Hải Châu 1, Quận Hải Châu, Đà Nẵng' WHERE hub_code = 'POST-DN-HC';
UPDATE hubs SET address = N'Số 251 Điện Biên Phủ, Phường Chính Gián, Quận Thanh Khê, Đà Nẵng' WHERE hub_code = 'POST-DN-TK';
UPDATE hubs SET address = N'Số 1 Ngô Quyền, Phường Thọ Quang, Quận Sơn Trà, Đà Nẵng' WHERE hub_code = 'POST-DN-ST';

UPDATE hubs SET address = N'Số 147 Lương Khánh Thiện, Phường Cầu Đất, Quận Ngô Quyền, Hải Phòng' WHERE hub_code = 'POST-HP-NQ';
UPDATE hubs SET address = N'Số 5 Nguyễn Tri Phương, Phường Minh Khai, Quận Hồng Bàng, Hải Phòng' WHERE hub_code = 'POST-HP-HB';

UPDATE hubs SET address = N'Số 2 Hòa Bình, Phường Tân An, Quận Ninh Kiều, Cần Thơ' WHERE hub_code = 'POST-CT-NK';
UPDATE hubs SET address = N'Số 321 Quốc Lộ 1A, Phường Lê Bình, Quận Cái Răng, Cần Thơ' WHERE hub_code = 'POST-CT-CR';
GO
