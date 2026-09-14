/**
 * E2E kiểm tra "cổng lưu kho" tại kho tổng:
 * - Cập bến kho tổng phải để tồn kho ở RECEIVED (khu tiếp nhận), KHÔNG auto-STORED.
 * - Sau khi thủ kho gọi store (Lưu kho) mới chuyển STORED và sẵn sàng lên chuyến tiếp theo.
 *
 * LƯU Ý: Script thay đổi dữ liệu thật (tạo 1 chuyến LINEHAUL, chuyển 1 kiện từ
 * HUB-HN-01 sang HUB-DN-01). Chạy SAU KHI rebuild/restart routing-service.
 *
 * Chạy: node scratch/test_hub_unload_gate.js
 */
const http = require('http');

const BASE = { host: 'localhost', port: 8080 };
let TOKEN = '';
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function requestOnce(method, path, body) {
    return new Promise((resolve, reject) => {
        const payload = body ? JSON.stringify(body) : null;
        const req = http.request({
            hostname: BASE.host,
            port: BASE.port,
            path,
            method,
            headers: Object.assign(
                { 'Content-Type': 'application/json' },
                TOKEN ? { Authorization: 'Bearer ' + TOKEN } : {}
            )
        }, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode >= 400) {
                    const error = new Error(method + ' ' + path + ' -> ' + res.statusCode + ' ' + data.slice(0, 200));
                    error.status = res.statusCode;
                    reject(error);
                    return;
                }
                try {
                    resolve(data ? JSON.parse(data) : null);
                } catch (error) {
                    resolve(data);
                }
            });
        });
        req.on('error', reject);
        if (payload) req.write(payload);
        req.end();
    });
}

async function request(method, path, body) {
    for (let attempt = 0; attempt < 6; attempt += 1) {
        try {
            return await requestOnce(method, path, body);
        } catch (error) {
            if (error.status !== 429 || attempt === 5) throw error;
            await sleep(4000 + attempt * 2000);
        }
    }
    throw new Error('unreachable');
}

let failures = 0;
function check(label, condition, detail) {
    if (!condition) failures += 1;
    console.log((condition ? 'PASS' : 'FAIL') + ' | ' + label + (detail !== undefined ? ': ' + detail : ''));
}

(async () => {
    const login = await request('POST', '/api/auth/login', {
        email: 'admin@waybill.vn',
        password: 'Admin@123456'
    });
    TOKEN = login.accessToken || login.token;

    const sourceHub = 'HUB-HN-01';
    const destHub = 'HUB-DN-01';

    const sourceInventory = await request('GET', '/api/routing/locations/' + sourceHub + '/inventory');
    const candidate = (Array.isArray(sourceInventory) ? sourceInventory : [])
        .find(item => String(item.inventoryStatus || '').toUpperCase() === 'STORED');
    if (!candidate) {
        console.log('SKIP | Không có kiện STORED tại ' + sourceHub + ' để kiểm thử.');
        process.exit(0);
    }
    console.log('Dùng kiện', candidate.trackingCode, '(' + candidate.inventoryStatus + ') tại', sourceHub);

    const tripCode = 'TRIP-TEST-GATE-' + Date.now().toString(36).toUpperCase();
    const trip = await request('POST', '/api/routing/trips', {
        tripCode,
        routeName: 'Test cổng lưu kho ' + sourceHub + ' -> ' + destHub,
        originHub: sourceHub,
        vehiclePlate: 'TEST-GATE-01',
        driverName: 'Test Gate',
        tripType: 'LINEHAUL',
        maxWeight: 5000,
        stopHubCodes: [sourceHub, destHub]
    });
    check('Tạo chuyến test thành công', Boolean(trip?.id), tripCode);

    const consolidated = await request('POST', '/api/routing/trips/' + trip.id + '/consolidate', {
        items: [{
            trackingCode: candidate.trackingCode,
            originHub: sourceHub,
            destinationHub: destHub,
            weight: Number(candidate.weightKg) || 2,
            serviceType: 'EXPRESS'
        }]
    });
    const loadedManifests = Array.isArray(consolidated?.manifests)
        ? consolidated.manifests.filter(m => String(m.status || '').toUpperCase() === 'LOADED')
        : [];
    check('Kiện STORED được gom lên chuyến', loadedManifests.some(m => m.trackingCode === candidate.trackingCode),
        loadedManifests.map(m => m.trackingCode).join(', '));

    await request('POST', '/api/routing/trips/' + trip.id + '/depart');
    await request('POST', '/api/routing/trips/' + trip.id + '/arrive?hubCode=' + encodeURIComponent(destHub));

    const destInventory = await request('GET', '/api/routing/locations/' + destHub + '/inventory');
    const unloaded = (Array.isArray(destInventory) ? destInventory : [])
        .find(item => item.trackingCode === candidate.trackingCode);
    check('Kiện đã dỡ xuống ' + destHub, Boolean(unloaded), JSON.stringify(unloaded || null));
    check('Cập bến kho tổng để tồn kho ở RECEIVED (chờ lưu kho)',
        String(unloaded?.inventoryStatus || '').toUpperCase() === 'RECEIVED',
        'inventoryStatus = ' + (unloaded?.inventoryStatus || 'N/A'));

    if (String(unloaded?.inventoryStatus || '').toUpperCase() !== 'RECEIVED') {
        console.log('GỢI Ý: nếu thấy STORED, routing-service chưa được rebuild/restart với thay đổi mới.');
    }

    await request('POST', '/api/routing/locations/' + destHub + '/store', {
        trackingCodes: [candidate.trackingCode],
        note: 'Kiểm thử: xác nhận lưu kho sau cập bến'
    });
    const afterStore = await request('GET', '/api/routing/locations/' + destHub + '/inventory');
    const stored = (Array.isArray(afterStore) ? afterStore : [])
        .find(item => item.trackingCode === candidate.trackingCode);
    check('Sau khi Lưu kho, tồn kho chuyển STORED',
        String(stored?.inventoryStatus || '').toUpperCase() === 'STORED',
        'inventoryStatus = ' + (stored?.inventoryStatus || 'N/A'));

    console.log('\nLưu ý: kiện ' + candidate.trackingCode + ' đã được chuyển sang ' + destHub + ' (dữ liệu demo thay đổi).');
    console.log('\n' + (failures === 0 ? 'TẤT CẢ KIỂM THỬ ĐỀU PASS' : failures + ' KIỂM THỬ THẤT BẠI'));
    process.exit(failures === 0 ? 0 : 1);
})().catch(error => {
    console.error('LỖI KIỂM THỬ:', error.message || error);
    process.exit(1);
});
