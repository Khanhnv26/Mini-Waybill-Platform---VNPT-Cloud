/**
 * Kiểm tra thao tác gộp 1-Click "Tiếp nhận & Lưu kho" của HubOpsView.
 * Dùng dữ liệu giả + stub RoutingService ghi lại lời gọi để không thay đổi DB thật.
 *
 * Chạy: node scratch/test_hub_receive_store.js
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
                    const error = new Error(method + ' ' + path + ' -> ' + res.statusCode + ' ' + data.slice(0, 160));
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

const toasts = [];
global.window = global;
global.Vue = {
    ref: (value) => ({ value }),
    reactive: (value) => value,
    computed: (fn) => ({ get value() { return fn(); } }),
    watch: () => {},
    onMounted: () => {}
};
global.Auth = {
    getUser: () => ({ roles: ['ROLE_ADMIN'], role: 'ROLE_ADMIN' }),
    decodeJwtPayload: () => ({ roles: ['ROLE_ADMIN'], role: 'ROLE_ADMIN' }),
    getRoles: () => ['ROLE_ADMIN'],
    hasRole: (role) => String(role).toUpperCase().indexOf('ADMIN') !== -1,
    getLocationCode: () => ''
};
global.Utils = {
    showToast: (title, message, type) => toasts.push({ title, message, type }),
    formatStatusText: (value) => String(value || ''),
    getStatusBadgeClass: () => '',
    formatCurrency: (value) => String(value || 0),
    formatInventoryStatus: (value) => String(value || ''),
    formatLocationCode: (value) => String(value || ''),
    formatTransportLeg: (value) => String(value || ''),
    createOperationId: (prefix) => (prefix || 'op') + '-test-' + Math.random().toString(36).slice(2, 8)
};
global.ShipmentService = { getAll: () => request('GET', '/api/shipments') };

const recordedCalls = [];
const realRoutingService = {
    getAllHubs: () => request('GET', '/api/routing/hubs'),
    getInventory: (locationCode, status) => {
        const suffix = status && String(status).toUpperCase() !== 'ALL'
            ? '?status=' + encodeURIComponent(status)
            : '';
        return request('GET', '/api/routing/locations/' + encodeURIComponent(locationCode) + '/inventory' + suffix);
    },
    receiveAtLocation: async (locationCode, payload) => {
        recordedCalls.push({ op: 'receive', locationCode, codes: payload.trackingCodes });
        return {};
    },
    storeAtLocation: async (locationCode, payload) => {
        recordedCalls.push({ op: 'store', locationCode, codes: payload.trackingCodes });
        return {};
    }
};
global.RoutingService = realRoutingService;

const VIEWS_DIR = path.join(__dirname, '..', 'frontend', 'js', 'views');
const viewCode = fs.readFileSync(path.join(VIEWS_DIR, 'HubOpsView.js'), 'utf8');
vm.runInThisContext(viewCode, { filename: 'HubOpsView.js' });

let failures = 0;
function check(label, condition, detail) {
    if (!condition) failures += 1;
    console.log((condition ? 'PASS' : 'FAIL') + ' | ' + label + (detail !== undefined ? ': ' + detail : ''));
}

function makeItem(trackingCode, inventoryStatus) {
    return {
        trackingCode,
        currentStatus: 'PICKED_UP',
        status: 'PICKED_UP',
        inventoryStatus,
        rawInventoryStatus: inventoryStatus,
        locationCode: 'HUB-HN-01',
        sourceHub: 'HUB-HN-01',
        destinationHub: 'HUB-DN-01',
        weight: 2
    };
}

(async () => {
    const login = await request('POST', '/api/auth/login', {
        email: 'admin@waybill.vn',
        password: 'Admin@123456'
    });
    TOKEN = login.accessToken || login.token;

    const ctx = global.HubOpsView.setup({}, { emit: () => {} });
    ctx.selectedHub.value = 'HUB-HN-01';
    await ctx.loadShipmentsData();
    check('Nạp được dữ liệu tồn kho hub', ctx.shipmentsList.value.length >= 0, ctx.shipmentsList.value.length + ' kiện');

    // Case 1: chưa vào kho -> phải gọi receive rồi store theo đúng thứ tự.
    recordedCalls.length = 0;
    const itemNew = makeItem('TEST-RS-01', '');
    ctx.shipmentsList.value = [...ctx.shipmentsList.value, itemNew];
    await ctx.handleReceiveAndStore(itemNew);
    check('Case mới: gọi đúng 2 bước', recordedCalls.length === 2, recordedCalls.map(c => c.op).join(' -> '));
    check('Case mới: thứ tự receive -> store',
        recordedCalls[0]?.op === 'receive' && recordedCalls[1]?.op === 'store',
        recordedCalls.map(c => c.op).join(' -> '));
    check('Case mới: đúng trạm HUB-HN-01',
        recordedCalls.every(call => call.locationCode === 'HUB-HN-01'),
        recordedCalls.map(call => call.locationCode).join(', '));
    check('Case mới: toast xác nhận nhận & lưu kho',
        toasts.some(t => String(t.message).includes('tiếp nhận & lưu kho')),
        toasts[toasts.length - 1]?.message);

    // Case 2: đã RECEIVED -> chỉ gọi store.
    recordedCalls.length = 0;
    toasts.length = 0;
    const itemReceived = makeItem('TEST-RS-02', 'RECEIVED');
    ctx.shipmentsList.value = [...ctx.shipmentsList.value, itemReceived];
    await ctx.handleReceiveAndStore(itemReceived);
    check('Case đã tiếp nhận: chỉ gọi store',
        recordedCalls.length === 1 && recordedCalls[0].op === 'store',
        recordedCalls.map(c => c.op).join(' -> '));

    // Case 3: đã STORED -> không gọi bước nào.
    recordedCalls.length = 0;
    toasts.length = 0;
    const itemStored = makeItem('TEST-RS-03', 'STORED');
    ctx.shipmentsList.value = [...ctx.shipmentsList.value, itemStored];
    await ctx.handleReceiveAndStore(itemStored);
    check('Case đã lưu kho: không gọi thêm bước nào', recordedCalls.length === 0,
        recordedCalls.map(c => c.op).join(' -> ') || 'không có');
    check('Case đã lưu kho: có thông báo không cần cập nhật',
        toasts.some(t => String(t.message).includes('không cần cập nhật')),
        toasts[toasts.length - 1]?.message);

    console.log('\n' + (failures === 0 ? 'TẤT CẢ KIỂM THỬ ĐỀU PASS' : failures + ' KIỂM THỬ THẤT BẠI'));
    process.exit(failures === 0 ? 0 : 1);
})().catch(error => {
    console.error('LỖI KIỂM THỬ:', error);
    process.exit(1);
});
