const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('PaymentView formats transfer memo (cú pháp CK) without VNPT', () => {
    const paymentViewPath = path.resolve(__dirname, '../js/views/PaymentView.js');
    const content = fs.readFileSync(paymentViewPath, 'utf8');

    assert.match(content, /replace\(\/\^VNPT-\?\/i,\s*'WB-'\)/, 'PaymentView strips VNPT- from transfer memo');
    assert.doesNotMatch(content, /Cú pháp CK:.*VNPT/, 'PaymentView template does not hardcode VNPT in transfer memo');
});

test('ShipmentView and ShipperView format transfer notes without VNPT', () => {
    const shipmentViewPath = path.resolve(__dirname, '../js/views/ShipmentView.js');
    const shipmentContent = fs.readFileSync(shipmentViewPath, 'utf8');
    assert.match(shipmentContent, /replace\(\/\^VNPT-\?\/i,\s*'WB-'\)/, 'ShipmentView sanitizes tracking code for QR memo');

    const shipperViewPath = path.resolve(__dirname, '../js/views/ShipperView.js');
    const shipperContent = fs.readFileSync(shipperViewPath, 'utf8');
    assert.match(shipperContent, /Nội dung: COD \{\{ \(deliveryTargetShipment\?\.trackingCode \|\| ''\)\.replace\(\/\^VNPT-\?\/i,\s*'WB-'\) \}\}/, 'ShipperView removes VNPT from COD memo');
    assert.match(shipperContent, /Nội dung: CUOC HOAN \{\{ \(returnTargetShipment\?\.trackingCode \|\| ''\)\.replace\(\/\^VNPT-\?\/i,\s*'WB-'\) \}\}/, 'ShipperView removes VNPT from return fee memo');
});

test('Payment service configuration and VietQR service do not use VNPT in account-name or memo', () => {
    const appPropsPath = path.resolve(__dirname, '../../payment-service/src/main/resources/application.properties');
    const appProps = fs.readFileSync(appPropsPath, 'utf8');
    assert.match(appProps, /vietqr\.account-name=\$\{VIETQR_ACCOUNT_NAME:WAYBILL LOGISTICS\}/, 'account-name defaults to WAYBILL LOGISTICS');
    assert.doesNotMatch(appProps, /vietqr\.account-name=.*VNPT/, 'account-name does not contain VNPT');

    const vietQrServicePath = path.resolve(__dirname, '../../payment-service/src/main/java/org/app/paymentservice/service/impl/VietQrServiceImpl.java');
    const vietQrService = fs.readFileSync(vietQrServicePath, 'utf8');
    assert.match(vietQrService, /replaceAll\("\(\?i\)\^VNPT-\?", "WB-"\)/, 'VietQrServiceImpl replaces VNPT prefix with WB');
    assert.match(vietQrService, /replaceAll\("\(\?i\)VNPT", "WB"\)/, 'VietQrServiceImpl strips VNPT from memo');
});
