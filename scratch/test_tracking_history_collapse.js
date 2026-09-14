/**
 * Kiểm tra gộp mốc "Lịch Sử Luân Chuyển Bưu Cục" (TrackingView.collapseHistoryMilestones).
 * Dùng đúng chuỗi 22 bản ghi thật của một bưu gửi (lifecycle + legacy-status lặp lại,
 * cụm 1-Click bàn giao, mốc giữ chỗ + xuất bến).
 *
 * Chạy: node scratch/test_tracking_history_collapse.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

global.window = global;
global.Vue = {
    ref: (value) => ({ value }),
    reactive: (value) => value,
    computed: (fn) => ({ get value() { return fn(); } }),
    watch: () => {},
    onMounted: () => {},
    onUnmounted: () => {},
    nextTick: (fn) => (typeof fn === 'function' ? fn() : Promise.resolve())
};
global.Auth = {
    getUser: () => ({}),
    decodeJwtPayload: () => ({}),
    getRoles: () => [],
    hasRole: () => false,
    getLocationCode: () => ''
};
global.Utils = {
    showToast: () => {},
    formatNodeText: (value) => String(value || ''),
    formatStatusText: (value) => String(value || ''),
    formatOperationType: (value) => String(value || ''),
    formatTransportLeg: (value) => String(value || ''),
    formatTime: (value) => String(value || ''),
    formatCurrency: (value) => String(value || 0)
};
global.TrackingService = { getHistory: async () => [] };
global.ShipmentService = { getByCode: async () => null };
global.RoutingService = { getOperationHistory: async () => [] };

const VIEWS_DIR = path.join(__dirname, '..', 'frontend', 'js', 'views');
vm.runInThisContext(fs.readFileSync(path.join(VIEWS_DIR, 'TrackingView.js'), 'utf8'), {
    filename: 'TrackingView.js'
});

let failures = 0;
function check(label, condition, detail) {
    if (!condition) failures += 1;
    console.log((condition ? 'PASS' : 'FAIL') + ' | ' + label + (detail !== undefined ? ': ' + detail : ''));
}

const PO_HANDOFF_NOTE = 'Bưu cục [Bưu Cục Bến Nghé (Quận 1) (POST-HCM-Q1)] bàn giao bưu gửi cho bưu tá đi phát chặng cuối';
const ORIGIN_DEPART_NOTE = 'Chuyến xe TRIP-OF-20260914134420-58L5 (BKS: 29C-556.12, Tài xế: Vũ Văn Gom) đã xuất bến từ POST-HN-HBT.';
const ORIGIN_UNLOAD_NOTE = 'Chuyến xe trung chuyển gom hàng TRIP-OF-20260914134420-58L5 đã cập bến Kho Tổng gốc HUB-HN-01. Kiện hàng đã được dỡ xuống khu tiếp nhận.';
const LINEHAUL_DEPART_NOTE = 'Chuyến xe TRIP-LH-20260914134442-XGE8 (BKS: 29C-888.99) đã xuất bến từ HUB-HN-01.';
const LINEHAUL_ARRIVE_NOTE = 'Chuyến xe TRIP-LH-20260914134442-XGE8 đã cập bến trạm trung chuyển HUB-DN-01.';
const LINEHAUL_UNLOAD_NOTE = 'Chuyến xe TRIP-LH-20260914134442-XGE8 đã cập bến Kho Tổng Đích HUB-HCM-01. Kiện hàng đã được dỡ xuống khu tiếp nhận.';

const sample = [
    { timestamp: '2026-09-14T13:43:20.6815234', status: 'PENDING_ROUTING', note: 'Đơn hàng đã được khởi tạo và đang chờ phân tuyến' },
    { timestamp: '2026-09-14T13:43:20.7070065', status: 'ROUTE_ASSIGNED', eventId: '9f87d48b-1cfa-40d2-b35f-01618fbf25a1', note: 'Đã phân tuyến: Bưu cục gốc [POST-HN-HBT] tiếp nhận ➔ Chờ xe gom lên Kho Tổng [HUB-HN-01].' },
    { timestamp: '2026-09-14T13:43:30.8366997', status: 'PICKED_UP', operationId: 'post-office-receiveatlocation-8a29a608:WB1', operationType: 'RECEIVED_AT_POST_OFFICE', location: 'POST-HN-HBT', note: 'Bưu cục đã tiếp nhận bưu phẩm tại quầy từ người gửi' },
    { timestamp: '2026-09-14T13:43:45.4209716', status: 'PICKED_UP', operationId: 'post-office-storeatlocation-ad004e6e:WB1', operationType: 'STORED', location: 'POST-HN-HBT', note: 'Bưu cục đã xác nhận lưu kho' },
    { timestamp: '2026-09-14T13:44:20.1553674', status: 'IN_TRANSIT', operationId: 'RESERVE:TRIP-OF-20260914134420-58L5:WB1', operationType: 'RESERVED_FOR_TRIP', tripCode: 'TRIP-OF-20260914134420-58L5', location: 'POST-HN-HBT', note: 'Đã giữ chỗ bưu gửi cho chuyến xe TRIP-OF-20260914134420-58L5' },
    { timestamp: '2026-09-14T13:44:20.2406659', status: 'IN_TRANSIT', operationId: 'DEPART:TRIP-OF-20260914134420-58L5:WB1', operationType: 'DEPARTED', tripCode: 'TRIP-OF-20260914134420-58L5', location: 'POST-HN-HBT', note: ORIGIN_DEPART_NOTE },
    { timestamp: '2026-09-14T13:44:20.2679602', status: 'IN_TRANSIT', eventId: 'legacy-status:c8c0e986', note: ORIGIN_DEPART_NOTE },
    { timestamp: '2026-09-14T13:44:29.9314802', status: 'IN_TRANSIT', operationId: 'UNLOAD:TRIP-OF-20260914134420-58L5:WB1:HUB-HN-01', operationType: 'UNLOADED', tripCode: 'TRIP-OF-20260914134420-58L5', location: 'HUB-HN-01', note: ORIGIN_UNLOAD_NOTE },
    { timestamp: '2026-09-14T13:44:29.9562636', status: 'IN_TRANSIT', eventId: 'legacy-status:42346bd6', location: 'HUB-HN-01', note: ORIGIN_UNLOAD_NOTE },
    { timestamp: '2026-09-14T14:11:10.01551', status: 'IN_TRANSIT', operationId: 'RESERVE:TRIP-LH-20260914134442-XGE8:WB1', operationType: 'RESERVED_FOR_TRIP', tripCode: 'TRIP-LH-20260914134442-XGE8', location: 'HUB-HN-01', note: 'Đã giữ chỗ bưu gửi cho chuyến xe TRIP-LH-20260914134442-XGE8' },
    { timestamp: '2026-09-14T14:11:18.6182628', status: 'IN_TRANSIT', operationId: 'DEPART:TRIP-LH-20260914134442-XGE8:WB1', operationType: 'DEPARTED', tripCode: 'TRIP-LH-20260914134442-XGE8', location: 'HUB-HN-01', note: LINEHAUL_DEPART_NOTE },
    { timestamp: '2026-09-14T14:11:18.6390354', status: 'IN_TRANSIT', eventId: 'legacy-status:3d6b9f10', location: 'HUB-HN-01', note: LINEHAUL_DEPART_NOTE },
    { timestamp: '2026-09-14T14:11:22.3821419', status: 'IN_TRANSIT', operationId: 'ARRIVE:TRIP-LH:WB1:HUB-DN-01', operationType: 'ARRIVE', tripCode: 'TRIP-LH-20260914134442-XGE8', location: 'HUB-DN-01', note: LINEHAUL_ARRIVE_NOTE },
    { timestamp: '2026-09-14T14:11:22.4028493', status: 'IN_TRANSIT', eventId: 'legacy-status:d85a55d8', location: 'HUB-DN-01', note: LINEHAUL_ARRIVE_NOTE },
    { timestamp: '2026-09-14T14:11:25.5725625', status: 'ARRIVED_DEST_HUB', operationId: 'UNLOAD:TRIP-LH:WB1:HUB-HCM-01', operationType: 'UNLOADED', tripCode: 'TRIP-LH-20260914134442-XGE8', location: 'HUB-HCM-01', note: LINEHAUL_UNLOAD_NOTE },
    { timestamp: '2026-09-14T14:11:25.6544406', status: 'ARRIVED_DEST_HUB', eventId: 'legacy-status:92c6b670', location: 'HUB-HCM-01', note: LINEHAUL_UNLOAD_NOTE },
    { timestamp: '2026-09-14T14:11:52.677148', status: 'ARRIVED_DEST_HUB', operationId: 'hub-store-a0aa7b2f:WB1', operationType: 'STORED_AT_HUB', location: 'HUB-HCM-01', note: 'Lưu kho hàng loạt tại hub HUB-HCM-01' },
    { timestamp: '2026-09-14T14:13:45.5986829', status: 'ARRIVED_DEST_HUB', operationId: 'post-office-receiveatlocation-da45:WB1', operationType: 'RECEIVED_AT_POST_OFFICE', location: 'POST-HCM-Q1', note: PO_HANDOFF_NOTE },
    { timestamp: '2026-09-14T14:13:45.5986829', status: 'ARRIVED_DEST_HUB', eventId: 'legacy-status:41109f32', location: 'POST-HCM-Q1', note: PO_HANDOFF_NOTE },
    { timestamp: '2026-09-14T14:13:45.6909073', status: 'ARRIVED_DEST_HUB', operationId: 'post-office-storeatlocation-b5a5:WB1', operationType: 'STORED', location: 'POST-HCM-Q1', note: PO_HANDOFF_NOTE },
    { timestamp: '2026-09-14T14:13:45.6909073', status: 'ARRIVED_DEST_HUB', eventId: 'legacy-status:6f02bbba', location: 'POST-HCM-Q1', note: PO_HANDOFF_NOTE },
    { timestamp: '2026-09-14T14:13:45.7404193', status: 'OUT_FOR_DELIVERY', operationId: 'post-office-handofftocourier-ec84:WB1', operationType: 'HANDED_TO_COURIER', location: 'POST-HCM-Q1', note: PO_HANDOFF_NOTE }
];

const ctx = global.TrackingView.setup({}, { emit: () => {} });
const collapsed = ctx.collapseHistoryMilestones(sample);

console.log('=== KẾT QUẢ GỘP ===');
collapsed.forEach((m, i) => console.log([
    String(i + 1).padStart(2),
    String(m.timestamp).slice(11, 23),
    m.status,
    m.operationType || '(none)',
    'merged=' + (m.mergedCount || 1),
    (m.subSteps || []).join(' -> ') || ''
].join(' | ')));

check('Số mốc sau gộp = 11', collapsed.length === 11, collapsed.length);
check('Tổng bản ghi được bảo toàn = 22',
    collapsed.reduce((sum, m) => sum + (m.mergedCount || 1), 0) === sample.length,
    collapsed.reduce((sum, m) => sum + (m.mergedCount || 1), 0));

const newest = collapsed[0];
check('Mốc mới nhất là bàn giao bưu tá (OUT_FOR_DELIVERY)', newest.status === 'OUT_FOR_DELIVERY', newest.status);
check('Cụm bàn giao gộp đủ 5 bản ghi', (newest.mergedCount || 1) === 5, newest.mergedCount);

const newestSteps = (newest.subSteps || []).join(' -> ');
check('Cụm bàn giao có 3 bước phụ đúng thứ tự',
    newestSteps === 'Tiếp nhận tại quầy -> Lưu kho bưu cục -> Bàn giao bưu tá',
    newestSteps);

const departMilestones = collapsed.filter(m => m.status === 'IN_TRANSIT' && m.operationType === 'DEPARTED');
check('Có 2 mốc xuất bến (feeder + linehaul)', departMilestones.length === 2, departMilestones.length);
departMilestones.forEach(m => {
    check('Mốc xuất bến ' + m.tripCode + ' gộp 3 bản ghi (giữ chỗ + lifecycle + legacy)',
        (m.mergedCount || 1) === 3, m.mergedCount);
    check('Mốc xuất bến ' + m.tripCode + ' có chip "Giữ chỗ lên chuyến"',
        (m.subSteps || []).includes('Giữ chỗ lên chuyến'), (m.subSteps || []).join(' -> '));
});

// Không còn cặp nào trùng status + location + note trong 5 giây
const normalize = (value) => String(value ?? '').replace(/\s+/g, ' ').trim().toLowerCase();
let duplicatePairs = 0;
for (let i = 0; i + 1 < collapsed.length; i += 1) {
    const a = collapsed[i];
    const b = collapsed[i + 1];
    const sameStatus = a.status === b.status;
    const sameLocation = (a.location || '') === (b.location || '');
    const sameNote = normalize(a.note) === normalize(b.note) && normalize(a.note) !== '';
    const gap = Math.abs(new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    if (sameStatus && sameLocation && sameNote && gap <= 5000) duplicatePairs += 1;
}
check('Không còn cặp mốc trùng lặp liền kề', duplicatePairs === 0, duplicatePairs);

const statuses = new Set(collapsed.map(m => m.status));
['PENDING_ROUTING', 'ROUTE_ASSIGNED', 'PICKED_UP', 'ARRIVED_DEST_HUB', 'OUT_FOR_DELIVERY']
    .forEach(status => check('Không mất mốc nghiệp vụ ' + status, statuses.has(status)));

check('mergedMilestoneCount tính đúng (22 - 11 = 11)',
    (() => {
        ctx.trackingHistory.value = sample.map(item => ({ ...item }));
        return ctx.mergedMilestoneCount.value === 11;
    })(),
    ctx.mergedMilestoneCount.value);

console.log('\n' + (failures === 0 ? 'TẤT CẢ KIỂM THỬ ĐỀU PASS' : failures + ' KIỂM THỬ THẤT BẠI'));
process.exit(failures === 0 ? 0 : 1);
