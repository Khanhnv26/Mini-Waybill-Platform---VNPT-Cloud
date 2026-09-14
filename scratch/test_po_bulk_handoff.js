/**
 * Kiểm tra "Bàn giao bưu tá hàng loạt" tại PostOfficeOpsView:
 * - Kiện ARRIVED_DEST_HUB tại bưu cục được phép tích chọn (HANDOFF).
 * - Nút hàng loạt chỉ bật khi mọi kiện được chọn cùng thao tác HANDOFF.
 * - confirmHandoff chế độ lô gọi handoff cho từng kiện với cùng 1 bưu tá,
 *   tổng kết đúng khi có kiện lỗi.
 *
 * Dùng stub RoutingService nên KHÔNG thay đổi dữ liệu thật.
 * Chạy: node scratch/test_po_bulk_handoff.js
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
const handoffCalls = [];
let failOnceForCode = '';

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
    createOperationId: (prefix) => (prefix || 'op') + '-test-' + Math.random().toString(36).slice(2, 8)
};
global.ShipmentService = { getAll: () => request('GET', '/api/shipments') };

global.RoutingService = {
    getAllHubs: () => request('GET', '/api/routing/hubs'),
    getInventory: (locationCode, status) => {
        const suffix = status && String(status).toUpperCase() !== 'ALL'
            ? '?status=' + encodeURIComponent(status)
            : '';
        return request('GET', '/api/routing/locations/' + encodeURIComponent(locationCode) + '/inventory' + suffix);
    },
    createOperationId: (prefix) => (prefix || 'op') + '-test',
    receiveAtLocation: async () => ({}),
    storeAtLocation: async () => ({}),
    handoffToCourier: async (locationCode, payload, courierId) => {
        const code = payload?.trackingCode || payload?.trackingCodes?.[0] || '';
        handoffCalls.push({ locationCode, code, courierId });
        if (failOnceForCode && code === failOnceForCode) {
            throw new Error('Stub lỗi có chủ đích cho ' + code);
        }
        return {};
    }
};

const VIEWS_DIR = path.join(__dirname, '..', 'frontend', 'js', 'views');
const viewCode = fs.readFileSync(path.join(VIEWS_DIR, 'PostOfficeOpsView.js'), 'utf8');
vm.runInThisContext(viewCode, { filename: 'PostOfficeOpsView.js' });

let failures = 0;
function check(label, condition, detail) {
    if (!condition) failures += 1;
    console.log((condition ? 'PASS' : 'FAIL') + ' | ' + label + (detail !== undefined ? ': ' + detail : ''));
}

function makeItem(code, overrides = {}) {
    return Object.assign({
        trackingCode: code,
        currentStatus: 'ARRIVED_DEST_HUB',
        status: 'ARRIVED_DEST_HUB',
        inventoryStatus: 'STORED',
        rawInventoryStatus: 'STORED',
        locationCode: 'POST-HCM-Q1',
        destPostOffice: 'POST-HCM-Q1',
        receiverName: 'Người nhận ' + code,
        receiverAddress: '123 Lê Lợi, Quận 1',
        codAmount: 200000,
        weight: 2
    }, overrides);
}

(async () => {
    const login = await request('POST', '/api/auth/login', {
        email: 'admin@waybill.vn',
        password: 'Admin@123456'
    });
    TOKEN = login.accessToken || login.token;

    const ctx = global.PostOfficeOpsView.setup({}, { emit: () => {} });
    ctx.selectedPostOffice.value = 'POST-HCM-Q1';
    await ctx.loadShipmentsData();

    const items = [
        makeItem('TEST-BULK-01'),
        makeItem('TEST-BULK-02', { codAmount: 350000 }),
        makeItem('TEST-BULK-03', { weight: 5 })
    ];
    const nonHandoff = makeItem('TEST-BULK-04', {
        currentStatus: 'IN_TRANSIT',
        status: 'IN_TRANSIT',
        inventoryStatus: ''
    });
    ctx.shipmentsList.value = [...ctx.shipmentsList.value, ...items, nonHandoff];

    check('Kiện ARRIVED_DEST_HUB được phép tích chọn hàng loạt',
        items.every(item => ctx.isBulkPostOfficeAction(item)), 'true');
    check('Kiện IN_TRANSIT không có thao tác lô phù hợp',
        ctx.isBulkPostOfficeAction(nonHandoff) === false, 'false');

    ctx.selectedTrackingCodes.value = new Set(items.map(i => i.trackingCode));
    check('Chọn toàn kiện bàn giao -> action = handoff',
        ctx.selectedPostOfficeAction.value === 'handoff', ctx.selectedPostOfficeAction.value);
    check('Tổng lô đúng số kiện', ctx.handoffBulkTotals.value.count === 3, ctx.handoffBulkTotals.value.count);
    check('Tổng COD = 750000', ctx.handoffBulkTotals.value.cod === 750000, ctx.handoffBulkTotals.value.cod);
    check('Tổng khối lượng = 9kg', ctx.handoffBulkTotals.value.weight === 9, ctx.handoffBulkTotals.value.weight);

    ctx.openBulkHandoffModal();
    check('Modal mở ở chế độ lô', ctx.handoffForm.bulkMode === true);
    check('Modal chứa đủ 3 mã', (ctx.handoffForm.bulkCodes || []).length === 3, JSON.stringify(ctx.handoffForm.bulkCodes));

    handoffCalls.length = 0;
    toasts.length = 0;
    const courier = ctx.handoffForm.selectedCourier;
    await ctx.confirmHandoff();
    check('Gọi handoff đúng 3 lần', handoffCalls.length === 3, handoffCalls.length);
    check('Cùng 1 bưu tá cho cả lô', handoffCalls.every(call => call.courierId === courier), courier);
    check('Toast tổng kết 3/3 thành công',
        toasts.some(t => String(t.message).includes('3/3')), toasts[toasts.length - 1]?.message);

    // Ca có 1 kiện lỗi: nạp lại dữ liệu giả vì lần bàn giao trước đã reload danh sách thật.
    const itemsRound2 = items.map(item => Object.assign({}, item));
    ctx.shipmentsList.value = [...ctx.shipmentsList.value, ...itemsRound2];
    ctx.selectedTrackingCodes.value = new Set(itemsRound2.map(i => i.trackingCode));
    ctx.openBulkHandoffModal();
    failOnceForCode = 'TEST-BULK-02';
    handoffCalls.length = 0;
    toasts.length = 0;
    await ctx.confirmHandoff();
    check('Có lỗi 1 kiện vẫn gọi đủ 3 lần', handoffCalls.length === 3, handoffCalls.length);
    check('Toast tổng kết 2/3 + 1 lỗi',
        toasts.some(t => String(t.message).includes('2/3') && String(t.message).includes('1 kiện lỗi')),
        toasts[toasts.length - 1]?.message);
    failOnceForCode = '';

    console.log('\n' + (failures === 0 ? 'TẤT CẢ KIỂM THỬ ĐỀU PASS' : failures + ' KIỂM THỬ THẤT BẠI'));
    process.exit(failures === 0 ? 0 : 1);
})().catch(error => {
    console.error('LỖI KIỂM THỬ:', error.message || error);
    process.exit(1);
});
