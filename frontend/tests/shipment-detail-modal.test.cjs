const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('ShipmentDetailModal component file exists and is registered in app.js and index.html', () => {
    const modalPath = path.resolve(__dirname, '../js/components/common/ShipmentDetailModal.js');
    assert.equal(fs.existsSync(modalPath), true, 'ShipmentDetailModal.js should exist');

    const appJsContent = fs.readFileSync(path.resolve(__dirname, '../js/app.js'), 'utf8');
    assert.match(appJsContent, /import\s+['"]\.\/components\/common\/ShipmentDetailModal\.js['"]/, 'app.js imports ShipmentDetailModal.js');
    assert.match(appJsContent, /app\.component\(['"]shipment-detail-modal['"]/, 'app.js registers shipment-detail-modal component');
    assert.match(appJsContent, /const\s+openShipmentDetailModal\s*=/, 'app.js defines openShipmentDetailModal');
    assert.match(appJsContent, /showShipmentDetailModal\.value\s*=\s*true/, 'openShipmentDetailModal opens modal');

    const indexHtmlContent = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
    assert.match(indexHtmlContent, /<shipment-detail-modal/, 'index.html renders shipment-detail-modal tag');
});

test('handleViewTracking keeps currentTab intact and opens modal for internal views', () => {
    const appJsContent = fs.readFileSync(path.resolve(__dirname, '../js/app.js'), 'utf8');

    // Verify handleViewTracking calls openShipmentDetailModal when not already on 'tracking' tab
    assert.match(appJsContent, /if\s*\(currentTab\.value\s*===\s*['"]tracking['"]\)/, 'handleViewTracking branches for tracking tab vs internal views');
    assert.match(appJsContent, /openShipmentDetailModal\(code\)/, 'handleViewTracking delegates to openShipmentDetailModal for internal views');
});

test('ShipmentDetailModal opens GIS map by default and renders full postal route after loading', () => {
    const modalContent = fs.readFileSync(path.resolve(__dirname, '../js/components/common/ShipmentDetailModal.js'), 'utf8');

    assert.match(modalContent, /const\s+isMapOpen\s*=\s*ref\(true\)/, 'isMapOpen defaults to true');
    assert.match(modalContent, /const\s+ensureModalMapReady\s*=/, 'defines ensureModalMapReady helper');
    assert.match(modalContent, /getPostOfficeForAddress/, 'uses MapManager.getPostOfficeForAddress for real sender/receiver addresses');
    assert.match(modalContent, /buildVietnamWaypoints/, 'uses MapManager.buildVietnamWaypoints for corridor route');
    assert.match(modalContent, /PaymentService\.getPaymentByTracking/, 'syncs payment status from PaymentService');
});

test('ShipperView prevents double payment collection for prepaid orders', () => {
    const shipperContent = fs.readFileSync(path.resolve(__dirname, '../js/views/ShipperView.js'), 'utf8');

    assert.match(shipperContent, /const\s+isShipmentPaidOnline\s*=/, 'defines isShipmentPaidOnline helper');
    assert.match(shipperContent, /PaymentService\.getPaidTrackingCodes\(\)/, 'fetches paid tracking codes in loadShipmentsData');
    assert.match(shipperContent, /v-if="isShipmentPaidOnline\(deliveryTargetShipment\)"/, 'shows prepaid notice in delivery modal when order is already paid');
    assert.match(shipperContent, /if\s*\(isShipmentPaidOnline\(s\)\)\s*return\s*false/, 'excludes online-paid orders from unsettledCodShipments');
});
