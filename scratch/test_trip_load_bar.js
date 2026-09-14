/**
 * Kiểm tra thanh tải trọng TripsView: khối lượng hiển thị phải phản ánh
 * hàng đã chở (COMPLETED dùng tổng manifest) thay vì luôn 0 như currentWeight.
 *
 * Chạy: node scratch/test_trip_load_bar.js
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const vm = require('vm');

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

global.window = global;
global.Vue = {
    ref: (value) => ({ value }),
    reactive: (value) => value,
    computed: (fn) => ({ get value() { return fn(); } }),
    watch: () => {},
    onMounted: () => {}
};
global.Utils = {
    showToast: () => {},
    formatStatusText: (value) => String(value || ''),
    getStatusBadgeClass: () => '',
    formatCurrency: (value) => String(value || 0),
    formatInventoryStatus: (value) => String(value || ''),
    formatLocationCode: (value) => String(value || ''),
    formatTripStatus: (value) => String(value || ''),
    formatStopStatus: (value) => String(value || ''),
    createOperationId: (prefix) => (prefix || 'op') + '-test'
};
global.ShipmentService = { getAll: async () => [] };
global.RoutingService = {
    getAllTrips: () => request('GET', '/api/routing/trips'),
    getAllHubs: () => request('GET', '/api/routing/hubs')
};
global.TrackingService = { getHistory: async () => [] };
global.Api = { get: async () => ({ ok: false, status: 500, json: async () => ({}) }) };

const VIEWS_DIR = path.join(__dirname, '..', 'frontend', 'js', 'views');
const viewCode = fs.readFileSync(path.join(VIEWS_DIR, 'TripsView.js'), 'utf8');
vm.runInThisContext(viewCode, { filename: 'TripsView.js' });

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

    const ctx = global.TripsView.setup(
        { currentStation: 'ALL', embedded: false },
        { emit: () => {} }
    );
    await ctx.loadTrips();
    const trips = ctx.tripsList.value;
    if (!Array.isArray(trips) || trips.length === 0) {
        throw new Error('Không nạp được danh sách chuyến xe từ API');
    }

    console.log('=== SO SÁNH KHỐI LƯỢNG HIỂN THỊ (currentWeight cũ -> helper mới) ===');
    const rows = trips.map(trip => {
        const info = ctx.getTripLoadInfo(trip);
        const manifestCount = Array.isArray(trip.manifests) ? trip.manifests.length : 0;
        const manifestSum = (trip.manifests || []).reduce((sum, m) => sum + (Number(m.weightKg) || 0), 0);
        console.log([
            String(trip.id).padStart(3),
            String(trip.status).padEnd(10),
            'old=' + (trip.currentWeight || 0) + 'kg',
            'manifests=' + manifestCount + ' (' + manifestSum + 'kg)',
            'new=' + info.weight.toFixed(1) + 'kg',
            info.percentage.toFixed(2) + '%',
            info.isUnloaded ? 'ĐÃ DỠ' : ''
        ].join(' | '));
        return { trip, info, manifestCount, manifestSum };
    });

    const completedWithCargo = rows.filter(row =>
        String(row.trip.status).toUpperCase() === 'COMPLETED' && row.manifestCount > 0
    );
    check('Có chuyến COMPLETED mang hàng để kiểm tra', completedWithCargo.length > 0, completedWithCargo.length + ' chuyến');
    completedWithCargo.forEach(row => {
        check(
            'Chuyến ' + row.trip.id + ' (COMPLETED) hiển thị đúng tổng manifest',
            Math.abs(row.info.weight - row.manifestSum) < 0.001,
            row.info.weight + 'kg (manifest ' + row.manifestSum + 'kg)'
        );
        check(
            'Chuyến ' + row.trip.id + ' không còn hiển thị 0kg',
            row.info.weight > 0,
            row.info.weight + 'kg'
        );
    });

    const scheduledEmpty = rows.filter(row =>
        String(row.trip.status).toUpperCase() === 'SCHEDULED' && row.manifestCount === 0
    );
    scheduledEmpty.forEach(row => {
        check(
            'Chuyến ' + row.trip.id + ' (SCHEDULED, rỗng) giữ 0kg',
            row.info.weight === 0,
            row.info.weight + 'kg'
        );
    });

    rows.forEach(row => {
        check(
            'Chuyến ' + row.trip.id + ': % trong khoảng 0-100',
            row.info.percentage >= 0 && row.info.percentage <= 100,
            row.info.percentage.toFixed(2) + '%'
        );
        check(
            'Chuyến ' + row.trip.id + ': tải trọng thiết kế lấy từ API',
            row.info.capacity === (Number(row.trip.maxWeight) || 5000),
            row.info.capacity + 'kg'
        );
    });

    const map = ctx.tripLoadInfos.value;
    check('tripLoadInfos có đủ ' + trips.length + ' chuyến', map.size === trips.length, map.size);
    check('activeTripLoadInfo rỗng khi chưa mở chi tiết', ctx.activeTripLoadInfo.value.weight === 0, ctx.activeTripLoadInfo.value.weight);

    console.log('\n' + (failures === 0 ? 'TẤT CẢ KIỂM THỬ ĐỀU PASS' : failures + ' KIỂM THỬ THẤT BẠI'));
    process.exit(failures === 0 ? 0 : 1);
})().catch(error => {
    console.error('LỖI KIỂM THỬ:', error);
    process.exit(1);
});
