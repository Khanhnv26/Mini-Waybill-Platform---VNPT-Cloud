/**
 * ==============================================================================
 * VNPT CLOUD - UTILITIES & FORMATTERS
 * Bộ Tiện Ích Chuẩn Hóa Giao Diện Doanh Nghiệp, Toast Hệ Thống & Format Nghiệp Vụ
 * ==============================================================================
 */

(function () {
    const { reactive } = Vue;

    // Trạng thái thông báo Toast hệ thống
    const toastState = reactive({
        show: false,
        title: '',
        message: '',
        type: 'success', // 'success' | 'error' | 'warning' | 'info'
        timer: null
    });

    const showToast = (title, message, type = 'success') => {
        if (toastState.timer) {
            clearTimeout(toastState.timer);
        }
        toastState.title = title;
        toastState.message = message;
        toastState.type = type;
        toastState.show = true;

        toastState.timer = setTimeout(() => {
            toastState.show = false;
        }, 4000);
    };

    // Chuẩn hóa danh xưng vai trò (Roles) theo chuẩn danh mục Bưu chính VNPT
    const getRoleBadgeInfo = (roleName) => {
        switch (roleName) {
            case 'ROLE_ADMIN':
                return {
                    label: 'Quản Trị Hệ Thống',
                    code: 'ADMIN',
                    class: 'bg-rose-50 text-rose-700 border-rose-200',
                    dotClass: 'bg-rose-500'
                };
            case 'ROLE_CS':
                return {
                    label: 'Điều Hành & CSKH',
                    code: 'CSKH',
                    class: 'bg-purple-50 text-purple-700 border-purple-200',
                    dotClass: 'bg-purple-500'
                };
            case 'ROLE_HUB_OPERATOR':
                return {
                    label: 'Thủ Kho / Điều Phối Kho Tổng',
                    code: 'KHO TỔNG',
                    class: 'bg-indigo-50 text-indigo-700 border-indigo-200',
                    dotClass: 'bg-indigo-500'
                };
            case 'ROLE_POST_OFFICE_OPERATOR':
                return {
                    label: 'Giao Dịch Viên Bưu Cục',
                    code: 'BƯU CỤC',
                    class: 'bg-cyan-50 text-cyan-700 border-cyan-200',
                    dotClass: 'bg-cyan-500'
                };
            case 'ROLE_DISPATCHER':
                return {
                    label: 'Điều Phối Viên Vận Tải',
                    code: 'ĐIỀU PHỐI XE',
                    class: 'bg-orange-50 text-orange-700 border-orange-200',
                    dotClass: 'bg-orange-500'
                };
            case 'ROLE_SHIPPER':
                return {
                    label: 'Bưu Tá Phát Hàng',
                    code: 'BƯU TÁ',
                    class: 'bg-amber-50 text-amber-700 border-amber-200',
                    dotClass: 'bg-amber-500'
                };
            case 'ROLE_CUSTOMER':
                return {
                    label: 'Chủ Hàng / Ký Gửi',
                    code: 'CHỦ HÀNG',
                    class: 'bg-blue-50 text-blue-700 border-blue-200',
                    dotClass: 'bg-blue-500'
                };
            default:
                return {
                    label: roleName ? roleName.replace('ROLE_', '') : 'KHÁCH VÃNG LAI',
                    code: roleName || 'GUEST',
                    class: 'bg-slate-50 text-slate-600 border-slate-200',
                    dotClass: 'bg-slate-400'
                };
        }
    };

    // Chuẩn hóa tên Module phân quyền nghiệp vụ
    const formatModuleName = (moduleCode) => {
        switch (moduleCode) {
            case 'SHIPMENT': return 'Quản Trị Bưu Gửi & Vận Đơn';
            case 'TRACKING': return 'Giám Sát Lộ Trình & Tác Nghiệp Trạm';
            case 'USER': return 'Định Danh & Phân Quyền Truy Cập';
            case 'ROUTING': return 'Mạng Lưới Bưu Cục & Tuyến Luân Chuyển';
            case 'AUDIT': return 'Nhật Ký Kiểm Toán Tác Nghiệp';
            default: return moduleCode || 'Chung';
        }
    };

    const formatStatusText = (status, locationCode) => {
        switch (status) {
            case 'CREATED': return 'Tiếp nhận đơn hàng';
            case 'PENDING_ROUTING': return 'Chờ định tuyến bưu cục';
            case 'ROUTE_ASSIGNED': return 'Đã định tuyến luân chuyển';
            case 'PICKED_UP': return 'Đã lấy hàng từ người gửi';
            case 'IN_TRANSIT': return 'Đang vận chuyển liên tỉnh';
            case 'ARRIVED_DEST_HUB': {
                const loc = String(locationCode || '').toUpperCase();
                if (loc.startsWith('POST-')) {
                    return 'Đã đến bưu cục phát';
                }
                return 'Đã đến Kho Tổng đích';
            }
            case 'OUT_FOR_DELIVERY': return 'Đang chuyển phát';
            case 'DELIVERED': return 'Phát thành công';
            case 'FAILED':
            case 'DELIVERY_FAILED': return 'Phát không thành công';
            default: return status || 'N/A';
        }
    };

    // Chuẩn hóa màu sắc trạng thái bưu gửi
    const getStatusBadgeClass = (status) => {
        switch (status) {
            case 'CREATED':
            case 'PENDING_ROUTING':
                return 'bg-amber-50 text-amber-700 border-amber-200';
            case 'ROUTE_ASSIGNED':
            case 'PICKED_UP':
            case 'IN_TRANSIT':
                return 'bg-blue-50 text-blue-700 border-blue-200';
            case 'ARRIVED_DEST_HUB':
                return 'bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold';
            case 'OUT_FOR_DELIVERY':
                return 'bg-indigo-50 text-indigo-700 border-indigo-200';
            case 'DELIVERED':
                return 'bg-emerald-50 text-emerald-700 border-emerald-200';
            case 'FAILED':
            case 'DELIVERY_FAILED':
                return 'bg-rose-50 text-rose-700 border-rose-200';
            default:
                return 'bg-slate-50 text-slate-600 border-slate-200';
        }
    };

    const OPERATION_TYPE_LABELS = {
        SHIPMENT_CREATED: 'Đã tạo bưu gửi',
        ROUTE_ASSIGNED: 'Đã phân tuyến',
        RECEIVED_AT_POST_OFFICE: 'Đã tiếp nhận tại bưu cục',
        STORED: 'Đã nhập kho',
        RESERVED_FOR_TRIP: 'Đã giữ chỗ trên chuyến',
        LOADED: 'Đã xếp lên xe',
        DEPARTED: 'Đã xuất bến',
        ARRIVED: 'Đã cập bến',
        UNLOADED: 'Đã dỡ hàng',
        STORED_AT_HUB: 'Đã nhập kho tổng',
        HANDED_TO_COURIER: 'Đã bàn giao bưu tá',
        DELIVERED: 'Phát thành công',
        DELIVERY_FAILED: 'Phát không thành công',
        CANCELLED: 'Đã hủy',
        RETURNING: 'Đang hoàn hàng',
        RETURNED: 'Đã hoàn hàng'
    };

    const INVENTORY_STATUS_LABELS = {
        RECEIVED: 'Đã tiếp nhận',
        STORED: 'Đang lưu kho',
        RESERVED: 'Đã giữ chỗ trên chuyến',
        LOADED: 'Đã xếp lên xe',
        HANDED_TO_COURIER: 'Đã bàn giao bưu tá'
    };

    const TRANSPORT_LEG_LABELS = {
        ORIGIN_FEEDER: 'Xe gom đầu nguồn',
        LINEHAUL: 'Xe trục liên tỉnh',
        DESTINATION_FEEDER: 'Xe trung chuyển về bưu cục phát',
        LAST_MILE: 'Chặng phát cuối'
    };

    const TRIP_TYPE_LABELS = {
        ORIGIN_FEEDER: 'Xe gom đầu nguồn',
        LINEHAUL: 'Xe trục liên tỉnh',
        DESTINATION_FEEDER: 'Xe trung chuyển về bưu cục phát',
        FEEDER: 'Xe trung chuyển'
    };

    const enumCode = (value) => {
        if (value === undefined || value === null) return '';
        return String(value).trim().toUpperCase();
    };

    const formatMappedValue = (value, labels) => {
        const code = enumCode(value);
        if (!code) return 'N/A';
        return labels[code] || code.replace(/_/g, ' ');
    };

    // Chuẩn hóa loại tác nghiệp trong lịch sử xử lý bưu gửi.
    const formatOperationType = (operationType) => {
        const value = operationType && typeof operationType === 'object'
            ? operationType.operationType
            : operationType;
        return formatMappedValue(value, OPERATION_TYPE_LABELS);
    };

    // Chuẩn hóa trạng thái tồn kho vận hành.
    const formatInventoryStatus = (inventoryStatus) => {
        const value = inventoryStatus && typeof inventoryStatus === 'object'
            ? inventoryStatus.inventoryStatus
            : inventoryStatus;
        return formatMappedValue(value, INVENTORY_STATUS_LABELS);
    };

    // Chuẩn hóa chặng vận chuyển của kiện hàng.
    const formatTransportLeg = (transportLeg) => {
        const value = transportLeg && typeof transportLeg === 'object'
            ? transportLeg.transportLeg
            : transportLeg;
        return formatMappedValue(value, TRANSPORT_LEG_LABELS);
    };

    // Chuẩn hóa loại chuyến xe, hỗ trợ cả FEEDER mà giao diện cũ đang dùng.
    const formatTripType = (tripType) => {
        const value = tripType && typeof tripType === 'object'
            ? tripType.tripType
            : tripType;
        return formatMappedValue(value, TRIP_TYPE_LABELS);
    };

    const formatLocationCode = (locationCode, fallback = 'Chưa xác định') => {
        if (locationCode === undefined || locationCode === null || String(locationCode).trim() === '') {
            return fallback;
        }
        const code = String(locationCode).trim();
        const normalized = code.toUpperCase();
        if (normalized === 'DELIVERY_OFFICE') return 'Bưu cục phát';
        if (normalized.startsWith('HUB-')) return `Kho Tổng ${code}`;
        if (normalized.startsWith('POST-')) return `Bưu cục ${code}`;
        return code;
    };

    const isHubLocation = (locationCode) => {
        const value = locationCode && typeof locationCode === 'object'
            ? locationCode.locationCode
            : locationCode;
        return enumCode(value).startsWith('HUB-');
    };

    const isPostOfficeLocation = (locationCode) => {
        const value = locationCode && typeof locationCode === 'object'
            ? locationCode.locationCode
            : locationCode;
        const code = enumCode(value);
        return code.startsWith('POST-') || code === 'DELIVERY_OFFICE';
    };

    const getOperationId = (operation) => {
        if (!operation) return '';
        if (typeof operation === 'string') return operation;
        return operation.operationId || operation.eventId || operation.id || '';
    };

    const createOperationId = (prefix = 'operation') => {
        const safePrefix = String(prefix || 'operation').replace(/[^a-zA-Z0-9_-]/g, '-');
        const cryptoSource = typeof crypto !== 'undefined' ? crypto : null;
        if (cryptoSource && typeof cryptoSource.randomUUID === 'function') {
            return `${safePrefix}-${cryptoSource.randomUUID()}`;
        }
        return `${safePrefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    };

    // Format thời gian hiển thị
    const formatTime = (ts) => {
        if (!ts) return '';
        const d = new Date(ts);
        return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + d.toLocaleDateString('vi-VN');
    };

    // Format tiền tệ Việt Nam
    const formatCurrency = (amount) => {
        if (amount === undefined || amount === null) return '0 đ';
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    // Format node hành trình luân chuyển
    const formatNodeText = (node, status) => {
        if (!node || node.includes('?') || node.trim() === '') {
            return formatStatusText(status);
        }
        if (node.includes('ROUTE-') && !node.includes('➔')) {
            const match = node.match(/ROUTE-([A-Z0-9-]+)-TO-([A-Z0-9-]+)/);
            if (match) return 'Tuyến luân chuyển: ' + match[1] + ' ➔ ' + match[2];
        }
        return node;
    };

    // Format JSON phục vụ kiểm toán tác nghiệp
    const formatJson = (str) => {
        try {
            return JSON.stringify(JSON.parse(str), null, 2);
        } catch {
            return str;
        }
    };

    window.Utils = {
        toastState,
        showToast,
        getRoleBadgeInfo,
        formatModuleName,
        formatStatusText,
        getStatusBadgeClass,
        formatOperationType,
        formatInventoryStatus,
        formatTransportLeg,
        formatTripType,
        formatLocationCode,
        isHubLocation,
        isPostOfficeLocation,
        getOperationId,
        createOperationId,
        formatTime,
        formatCurrency,
        formatNodeText,
        formatJson
    };
})();
