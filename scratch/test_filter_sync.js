/**
 * Kiểm thử đồng bộ filter: số đếm KPI/nút lọc phải bằng số dòng khi lọc,
 * chạy trực tiếp logic thật của 3 view trên dữ liệu thật của backend.
 *
 * Chạy: node scratch/test_filter_sync.js
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const vm = require('vm');

const BASE = { host: 'localhost', port: 8080 };
let TOKEN = '';
let apiCallCount = 0;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function requestOnce(method, path, body) {
    apiCallCount += 1;
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

// Gateway giới hạn tần suất theo user, script kiểm thử cần retry 429 thay vì
// coi dữ liệu rỗng là kết quả đúng.
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

// --- Harness tối giản để chạy trực tiếp file view (không có DOM) ---
global.window = global;
global.Vue = {
    ref: (value) => ({ value }),
    reactive: (value) => value,
    computed: (fn) => ({ get value() { return fn(); } }),
    watch: () => {},
    onMounted: () => {}
};
global.Auth = {
    getUser: () => ({ id: 1, roles: ['ROLE_ADMIN'], role: 'ROLE_ADMIN' }),
    decodeJwtPayload: () => ({ roles: ['ROLE_ADMIN'], role: 'ROLE_ADMIN' }),
    getRoles: () => ['ROLE_ADMIN'],
    hasRole: (role) => String(role).toUpperCase().indexOf('ADMIN') !== -1,
    getLocationCode: () => ''
};
global.Utils = {
    showToast: () => {},
    formatStatusText: (value) => String(value || ''),
    getStatusBadgeClass: () => '',
    formatCurrency: (value) => String(value || 0),
    formatInventoryStatus: (value) => String(value || ''),
    formatLocationCode: (value) => String(value || ''),
    createOperationId: (prefix) => (prefix || 'op') + '-test'
};
global.ShipmentService = {
    getAll: () => request('GET', '/api/shipments')
};
global.RoutingService = {
    getAllHubs: () => request('GET', '/api/routing/hubs'),
    getInventory: (locationCode, status) => {
        const suffix = status && String(status).toUpperCase() !== 'ALL'
            ? '?status=' + encodeURIComponent(status)
            : '';
        return request('GET', '/api/routing/locations/' + encodeURIComponent(locationCode) + '/inventory' + suffix);
    }
};
global.TrackingService = { getHistory: async () => [] };
global.Api = {
    get: async (url) => {
        try {
            const data = await request('GET', url);
            return { ok: true, status: 200, json: async () => data };
        } catch (error) {
            return { ok: false, status: error.status || 500, json: async () => ({}) };
        }
    },
    parseError: async (response, fallback) => new Error(fallback || 'Api error')
};

const VIEWS_DIR = path.join(__dirname, '..', 'frontend', 'js', 'views');
function loadView(fileName) {
    const code = fs.readFileSync(path.join(VIEWS_DIR, fileName), 'utf8');
    vm.runInThisContext(code, { filename: fileName });
    return global[path.basename(fileName, '.js')];
}

let failures = 0;
function check(label, actual, expected) {
    const ok = actual === expected;
    if (!ok) failures += 1;
    console.log((ok ? 'PASS' : 'FAIL') + ' | ' + label + ': ' + actual + (ok ? '' : ' (kỳ vọng ' + expected + ')'));
}

async function login() {
    const response = await request('POST', '/api/auth/login', {
        email: 'admin@waybill.vn',
        password: 'Admin@123456'
    });
    TOKEN = response.accessToken || response.token;
}

async function testPostOffice() {
    console.log('\n=== KHAI THÁC BƯU CỤC (PostOfficeOpsView) ===');
    const view = loadView('PostOfficeOpsView.js');
    const ctx = view.setup({}, { emit: () => {} });

    const pillCases = [
        { subtab: 'outbound', filter: 'ALL', count: () => ctx.outboundCount.value },
        { subtab: 'outbound', filter: 'WAITING_INTAKE', count: () => ctx.kpiAwaitingIntake.value },
        { subtab: 'outbound', filter: 'STORED_OFFICE', count: () => ctx.kpiStagedInOffice.value },
        { subtab: 'outbound', filter: 'IN_TRANSIT', count: () => ctx.kpiInTransitOutbound.value },
        { subtab: 'inbound', filter: 'ALL', count: () => ctx.inboundCount.value },
        { subtab: 'inbound', filter: 'WAITING_HANDOFF', count: () => ctx.kpiArrivedFromHub.value },
        { subtab: 'inbound', filter: 'OUT_FOR_DELIVERY', count: () => ctx.kpiOutForDelivery.value },
        { subtab: 'inbound', filter: 'DELIVERED', count: () => ctx.kpiDeliveredInbound.value },
        { subtab: 'inventory', filter: 'ALL', count: () => ctx.inventoryCount.value },
        { subtab: 'inventory', filter: 'STORED_OFFICE', count: () => ctx.inventoryStagedCount.value },
        { subtab: 'inventory', filter: 'WAITING_HANDOFF', count: () => ctx.inventoryWaitingHandoffCount.value }
    ];

    // Nạp tồn kho một lần cho toàn mạng, sau đó đổi bưu cục phải lọc client-side (0 request).
    await ctx.loadShipmentsData();
    if (ctx.shipmentsList.value.length === 0) {
        throw new Error('PostOfficeOpsView không nạp được dữ liệu');
    }
    const callsAfterLoad = apiCallCount;
    for (const scope of ['ALL', 'POST-HN-CG', 'POST-HCM-Q1']) {
        ctx.selectedPostOffice.value = scope;
        for (const testCase of pillCases) {
            ctx.currentSubtab.value = testCase.subtab;
            ctx.selectedStatusFilter.value = testCase.filter;
            check(
                'PO [' + scope + '] ' + testCase.subtab + '/' + testCase.filter,
                ctx.filteredShipments.value.length,
                testCase.count()
            );
        }
    }
    check('PO đổi bưu cục không phát sinh request mạng', apiCallCount, callsAfterLoad);
}

async function testHub() {
    console.log('\n=== KHAI THÁC KHO TỔNG (HubOpsView) ===');
    const view = loadView('HubOpsView.js');
    const ctx = view.setup({}, { emit: () => {} });
    await ctx.loadShipmentsData();
    if (ctx.shipmentsList.value.length === 0) {
        console.log('SKIP | Kho tổng hiện không có tồn kho (dữ liệu demo trống) — bỏ qua kiểm tra Hub.');
        return;
    }

    const buckets = ['WAITING_INTAKE', 'RECEIVED', 'STORED', 'IN_TRANSIT', 'ARRIVED_DEST_HUB',
        'HANDED_TO_COURIER', 'PICKED_UP', 'CANCELLED'];

    for (const scope of ['ALL', 'HUB-HN-01']) {
        ctx.selectedHub.value = scope;
        await ctx.loadShipmentsData(true);

        const bucketCounts = {};
        const seen = new Map();
        let duplicated = 0;
        for (const bucket of buckets) {
            ctx.selectedStatusFilter.value = bucket;
            const codes = ctx.filteredShipments.value.map(item => String(item.trackingCode || '').toUpperCase());
            bucketCounts[bucket] = codes.length;
            codes.forEach(code => {
                if (seen.has(code)) duplicated += 1;
                seen.set(code, true);
            });
        }
        ctx.selectedStatusFilter.value = 'ALL';
        const allCount = ctx.filteredShipments.value.length;
        check('Hub [' + scope + '] mỗi kiện chỉ thuộc 1 bucket (không trùng)', duplicated, 0);
        check('Hub [' + scope + '] tổng bucket <= tổng danh sách', seen.size <= allCount, true);
        check('Hub [' + scope + '] KPI tồn = RECEIVED + STORED',
            ctx.kpiTotalInHub.value, bucketCounts.RECEIVED + bucketCounts.STORED);
        check('Hub [' + scope + '] KPI chờ nhập = bucket WAITING_INTAKE',
            ctx.kpiAwaitingIntake.value, bucketCounts.WAITING_INTAKE);
        check('Hub [' + scope + '] KPI luân chuyển = bucket IN_TRANSIT',
            ctx.kpiInTransit.value, bucketCounts.IN_TRANSIT);
    }
}

async function testShipper() {
    console.log('\n=== BƯU TÁ GIAO VẬN (ShipperView) ===');
    const view = loadView('ShipperView.js');
    const ctx = view.setup({}, { emit: () => {} });
    await ctx.loadShipmentsData();
    if (ctx.shipmentsList.value.length === 0) {
        throw new Error('ShipperView không nạp được dữ liệu bưu gửi');
    }

    ctx.selectedStatusFilter.value = 'ALL';
    check('Shipper [ALL] danh sách lọc = danh sách nền',
        ctx.filteredShipments.value.length, ctx.deliveryShipments.value.length);
    check('Shipper [ALL] tổng = số kiện chặng cuối',
        ctx.filteredShipments.value.length, ctx.deliveryShipments.value.length);

    const directCases = ['OUT_FOR_DELIVERY', 'DELIVERED', 'DELIVERY_FAILED', 'RETURNING', 'RETURNED'];
    for (const status of directCases) {
        ctx.selectedStatusFilter.value = status;
        check('Shipper [' + status + '] khớp trạng thái',
            ctx.filteredShipments.value.length,
            ctx.deliveryShipments.value.filter(s => ctx.getShipmentStatus(s) === status).length);
    }

    ctx.selectedStatusFilter.value = 'ARRIVED_DEST_HUB';
    check('Shipper [ARRIVED_DEST_HUB] khớp KPI chờ đi phát',
        ctx.filteredShipments.value.length, ctx.kpiAwaitingDispatch.value);

    ctx.selectedStatusFilter.value = 'IN_TRANSIT';
    check('Shipper [IN_TRANSIT] không còn trên UI (luôn rỗng)',
        ctx.filteredShipments.value.length, 0);
}

(async () => {
    await login();
    await testPostOffice();
    await testHub();
    await testShipper();
    console.log('\n' + (failures === 0 ? 'TẤT CẢ KIỂM THỬ ĐỀU PASS' : failures + ' KIỂM THỬ THẤT BẠI'));
    process.exit(failures === 0 ? 0 : 1);
})().catch(error => {
    console.error('LỖI KIỂM THỬ:', error);
    process.exit(1);
});
