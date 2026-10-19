(function () {
    const { reactive } = Vue;
    const toastState = reactive({
        show: false,
        title: '',
        message: '',
        type: 'success',
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
    const hideToast = () => {
        if (toastState.timer) {
            clearTimeout(toastState.timer);
            toastState.timer = null;
        }
        toastState.show = false;
    };
    const getRoleBadgeInfo = (roleName) => {
        switch (roleName) {
            case 'ROLE_ADMIN':
                return {
                    label: 'Quản Trị Hệ Thống',
                    code: 'ADMIN',
                    class: 'text-slate-700 dark:text-slate-300 font-medium',
                    dotClass: 'bg-slate-400 dark:bg-slate-500'
                };
            case 'ROLE_CS':
                return {
                    label: 'Điều Hành & CSKH',
                    code: 'CSKH',
                    class: 'text-slate-700 dark:text-slate-300 font-medium',
                    dotClass: 'bg-slate-400 dark:bg-slate-500'
                };
            case 'ROLE_HUB_OPERATOR':
                return {
                    label: 'Thủ Kho / Điều Phối Kho Tổng',
                    code: 'KHO TỔNG',
                    class: 'text-slate-700 dark:text-slate-300 font-medium',
                    dotClass: 'bg-slate-400 dark:bg-slate-500'
                };
            case 'ROLE_POST_OFFICE_OPERATOR':
                return {
                    label: 'Giao Dịch Viên Bưu Cục',
                    code: 'BƯU CỤC',
                    class: 'text-slate-700 dark:text-slate-300 font-medium',
                    dotClass: 'bg-slate-400 dark:bg-slate-500'
                };
            case 'ROLE_DISPATCHER':
                return {
                    label: 'Điều Phối Viên Vận Tải',
                    code: 'ĐIỀU PHỐI XE',
                    class: 'text-slate-700 dark:text-slate-300 font-medium',
                    dotClass: 'bg-slate-400 dark:bg-slate-500'
                };
            case 'ROLE_SHIPPER':
                return {
                    label: 'Bưu Tá Phát Hàng',
                    code: 'BƯU TÁ',
                    class: 'text-slate-700 dark:text-slate-300 font-medium',
                    dotClass: 'bg-slate-400 dark:bg-slate-500'
                };
            case 'ROLE_CUSTOMER':
                return {
                    label: 'Chủ Hàng / Ký Gửi',
                    code: 'CHỦ HÀNG',
                    class: 'text-slate-700 dark:text-slate-300 font-medium',
                    dotClass: 'bg-slate-400 dark:bg-slate-500'
                };
            default:
                return {
                    label: roleName ? roleName.replace('ROLE_', '') : 'Khách vãng lai',
                    code: roleName || 'GUEST',
                    class: 'text-slate-600 dark:text-slate-400 font-normal',
                    dotClass: 'bg-slate-400 dark:bg-slate-500'
                };
        }
    };
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
    
    const STATUS_TONES = {
        slate: { dot: 'bg-slate-400 dark:bg-slate-500', text: 'text-slate-700 dark:text-slate-300 font-medium', badge: 'bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700' },
        blue: { dot: 'bg-blue-500 status-dot-pulse', text: 'text-blue-700 dark:text-blue-400 font-medium', badge: 'bg-blue-50/70 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200/80 dark:border-blue-900/60' },
        emerald: { dot: 'bg-emerald-500', text: 'text-emerald-700 dark:text-emerald-400 font-medium', badge: 'bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-900/60' },
        rose: { dot: 'bg-rose-500', text: 'text-rose-700 dark:text-rose-400 font-medium', badge: 'bg-rose-50/70 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200/80 dark:border-rose-900/60' },
        amber: { dot: 'bg-amber-500 status-dot-pulse', text: 'text-amber-700 dark:text-amber-400 font-medium', badge: 'bg-amber-50/70 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200/80 dark:border-amber-900/60' }
    };
    const mutedText = 'text-slate-600 dark:text-slate-400 font-medium';
    const neutralBadge = 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    const STATUS_CONFIG = {
        CREATED: { label: 'Tiếp Nhận Đơn', tone: 'slate', badge: neutralBadge },
        PENDING_ROUTING: { label: 'Chờ Định Tuyến', tone: 'slate', badge: neutralBadge },
        ROUTE_ASSIGNED: { label: 'Đã Định Tuyến', tone: 'blue' },
        PICKED_UP: { label: 'Đã Tiếp Nhận', tone: 'blue' },
        STORED: { label: loc => String(loc || '').toUpperCase().startsWith('POST-') ? 'Đã Lưu Bưu Cục' : 'Đã Lưu Kho', tone: 'blue' },
        IN_TRANSIT: { label: 'Đang Vận Chuyển', tone: 'blue' },
        ARRIVED_DEST_HUB: { label: loc => String(loc || '').toUpperCase().startsWith('POST-') ? 'Đến Bưu Cục Phát' : 'Đến Kho Đích', tone: 'blue' },
        OUT_FOR_DELIVERY: { label: 'Đang Phát Hàng', tone: 'blue' },
        DELIVERED: { label: 'Phát Thành Công', tone: 'emerald' },
        COMPLETED: { tone: 'emerald', badge: STATUS_TONES.slate.badge },
        ACTIVE: { tone: 'emerald', badge: STATUS_TONES.slate.badge },
        FAILED: { label: 'Phát Thất Bại', tone: 'rose' },
        DELIVERY_FAILED: { label: 'Phát Thất Bại', tone: 'rose' },
        RETURNING: { label: 'Đang Chuyển Hoàn', tone: 'amber' },
        OUT_FOR_RETURN: { label: 'Đang Phát Hoàn', tone: 'amber' },
        RETURNED: { label: 'Đã Hoàn Hàng', tone: 'slate', text: mutedText },
        CANCELLED: { label: 'Đã Hủy Đơn', tone: 'slate', text: mutedText },
        INACTIVE: { tone: 'slate', text: mutedText }
    };
    const statusConfig = status => Object.hasOwn(STATUS_CONFIG, status) ? STATUS_CONFIG[status] : { tone: 'slate' };
    const formatStatusText = (status, locationCode) => {
        const label = statusConfig(status).label;
        return typeof label === 'function' ? label(locationCode) : (label || status || '—');
    };
    const getStatusDotClass = status => STATUS_TONES[statusConfig(status).tone].dot;
    const getStatusIndicatorClass = status => 'status-indicator-' + statusConfig(status).tone;
    const getStatusTextClass = status => {
        const config = statusConfig(status);
        return config.text || STATUS_TONES[config.tone].text;
    };
    const getStatusBadgeClass = status => {
        const config = statusConfig(status);
        return config.badge || STATUS_TONES[config.tone].badge;
    };
    const formatStatusMeta = (status, locationCode) => ({
        text: formatStatusText(status, locationCode), dotClass: getStatusDotClass(status),
        textClass: getStatusTextClass(status), indicatorClass: getStatusIndicatorClass(status)
    });
    const OPERATION_TYPE_LABELS = {
        SHIPMENT_CREATED: 'Đã Tạo Đơn',
        ROUTE_ASSIGNED: 'Đã Phân Tuyến',
        RECEIVED_AT_POST_OFFICE: 'Đã Tiếp Nhận Bưu Cục',
        STORED: 'Đã Lưu Kho',
        RESERVED_FOR_TRIP: 'Đã Giữ Chỗ Chuyến Xe',
        LOADED: 'Đã Xếp Lên Xe',
        DEPARTED: 'Đã Xuất Bến',
        ARRIVED: 'Đã Cập Bến',
        UNLOADED: 'Đã Dỡ Hàng',
        STORED_AT_HUB: 'Đã Lưu Kho Tổng',
        HANDED_TO_COURIER: 'Đã Bàn Giao Bưu Tá',
        DELIVERED: 'Phát Thành Công',
        DELIVERY_FAILED: 'Phát Thất Bại',
        CANCELLED: 'Đã Hủy Đơn',
        RETURNING: 'Đang Chuyển Hoàn',
        RETURNED: 'Đã Hoàn Hàng'
    };
    const INVENTORY_STATUS_LABELS = {
        RECEIVED: 'Đã Tiếp Nhận',
        STORED: 'Đã Lưu Kho',
        RESERVED: 'Đã Giữ Chỗ',
        LOADED: 'Đã Xếp Lên Xe',
        HANDED_TO_COURIER: 'Đã Bàn Giao Bưu Tá'
    };
    const TRANSPORT_LEG_LABELS = {
        ORIGIN_FEEDER: 'Xe Gom Đầu Nguồn',
        LINEHAUL: 'Xe Trục Liên Tỉnh',
        DESTINATION_FEEDER: 'Xe Trung Chuyển Phát',
        LAST_MILE: 'Chặng Phát Cuối'
    };
    const TRIP_TYPE_LABELS = {
        ORIGIN_FEEDER: 'Xe Gom Đầu Nguồn',
        LINEHAUL: 'Xe Trục Liên Tỉnh',
        DESTINATION_FEEDER: 'Xe Trung Chuyển Phát',
        FEEDER: 'Xe Trung Chuyển'
    };
    const TRIP_STATUS_LABELS = {
        SCHEDULED: 'Đã Lập Chuyến',
        IN_TRANSIT: 'Đang Chạy Tuyến',
        COMPLETED: 'Đã Hoàn Thành',
        CANCELLED: 'Đã Hủy Chuyến'
    };
    const STOP_STATUS_LABELS = {
        PENDING: 'Chờ Cập Bến',
        ARRIVED: 'Đã Cập Bến',
        DEPARTED: 'Đã Rời Trạm'
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
    
    const formatOperationType = (operationType) => {
        const value = operationType && typeof operationType === 'object'
            ? operationType.operationType
            : operationType;
        return formatMappedValue(value, OPERATION_TYPE_LABELS);
    };
    
    const formatInventoryStatus = (inventoryStatus) => {
        const value = inventoryStatus && typeof inventoryStatus === 'object'
            ? inventoryStatus.inventoryStatus
            : inventoryStatus;
        return formatMappedValue(value, INVENTORY_STATUS_LABELS);
    };
    
    const formatTransportLeg = (transportLeg) => {
        const value = transportLeg && typeof transportLeg === 'object'
            ? transportLeg.transportLeg
            : transportLeg;
        return formatMappedValue(value, TRANSPORT_LEG_LABELS);
    };
    
    const formatTripType = (tripType) => {
        const value = tripType && typeof tripType === 'object'
            ? tripType.tripType
            : tripType;
        return formatMappedValue(value, TRIP_TYPE_LABELS);
    };
    const formatTripStatus = (status) => formatMappedValue(status, TRIP_STATUS_LABELS);
    const formatStopStatus = (status) => formatMappedValue(status, STOP_STATUS_LABELS);
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
    const formatTime = (ts) => {
        if (!ts) return '';
        const d = new Date(ts);
        return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + d.toLocaleDateString('vi-VN');
    };
    const formatCurrency = (amount) => {
        if (amount === undefined || amount === null) return '0 đ';
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };
    const formatNodeText = (node, status) => {
        if (!node || node.includes('?') || node.trim() === '') {
            return formatStatusText(status);
        }
        if (node.includes('ROUTE-') && !node.includes(' -> ')) {
            const match = node.match(/ROUTE-([A-Z0-9-]+)-TO-([A-Z0-9-]+)/);
            if (match) return 'Tuyến luân chuyển: ' + match[1] + ' -> ' + match[2];
        }
        return node;
    };
    const formatJson = (str) => {
        try {
            return JSON.stringify(JSON.parse(str), null, 2);
        } catch {
            return str;
        }
    };
    const formatEtaDateRange = (etaAt, etaMax) => {
        if (!etaAt) return null;
        try {
            const d1 = new Date(etaAt);
            if (isNaN(d1.getTime())) return null;
            const d2 = etaMax ? new Date(etaMax) : new Date(d1.getTime() + 12 * 3600000);
            const pad = (n) => String(n).padStart(2, '0');
            const formatDay = (d) => `${pad(d.getDate())} Th${pad(d.getMonth() + 1)}`;
            const timeStr = `${pad(d1.getHours())}:${pad(d1.getMinutes())}`;
            return {
                dateRange: `${formatDay(d1)} - ${formatDay(d2)}`,
                commitmentTime: `Trước ${timeStr}`,
                fullDisplay: `${formatDay(d1)} - ${formatDay(d2)} (Trước ${timeStr})`
            };
        } catch {
            return null;
        }
    };
    const getEffectiveEta = (shipment) => {
        if (!shipment) return null;
        if (shipment.estimatedDeliveryAt) {
            return formatEtaDateRange(shipment.estimatedDeliveryAt, shipment.estimatedDeliveryMax);
        }
        try {
            const baseDate = shipment.createdAt ? new Date(shipment.createdAt) : new Date();
            if (isNaN(baseDate.getTime())) return null;
            let isInter = true;
            const sAddr = (shipment.senderAddress || '').toLowerCase();
            const rAddr = (shipment.receiverAddress || '').toLowerCase();
            if (sAddr && rAddr) {
                const sLast = sAddr.split(',').pop().trim();
                const rLast = rAddr.split(',').pop().trim();
                if (sLast && rLast && (sLast.includes(rLast) || rLast.includes(sLast))) {
                    isInter = false;
                }
            }
            const daysToAdd = isInter ? 2 : 1;
            const etaMin = new Date(baseDate.getTime() + daysToAdd * 24 * 3600000);
            etaMin.setHours(isInter ? 17 : 18, 0, 0, 0);
            const etaMax = new Date(etaMin.getTime() + 12 * 3600000);
            return formatEtaDateRange(etaMin, etaMax);
        } catch {
            return null;
        }
    };
    const maskPhone = (phone, isStaffOrOwner = false) => {
        if (!phone) return '';
        if (isStaffOrOwner) return String(phone);
        const str = String(phone).trim();
        const clean = str.replace(/\D/g, '');
        if (clean.length < 7) return str;
        return clean.slice(0, 4) + '***' + clean.slice(-3);
    };
    const isValidImageUrl = (url) => {
        if (!url || typeof url !== 'string') return false;
        const trimmed = url.trim();
        if (!trimmed) return false;
        return trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:image/') || trimmed.startsWith('/');
    };
    const formatAvatarUrl = (url) => {
        if (!url || typeof url !== 'string') return null;
        const trimmed = url.trim();
        if (!trimmed) return null;
        if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:image/')) return trimmed;
        if (trimmed.startsWith('/')) return trimmed;
        if (trimmed.startsWith('support-tickets/')) return '/' + trimmed;
        return null;
    };
    
    window.initGoogleIdentity = function (clientId, callback) {
        if (typeof google === 'undefined' || !google.accounts || !google.accounts.id) return false;
        window.__gsiHandler = callback;
        if (!window.__gsiInitialized) {
            google.accounts.id.initialize({
                client_id: clientId,
                callback: function (response) {
                    if (typeof window.__gsiHandler === 'function') window.__gsiHandler(response);
                },
                auto_select: false
            });
            window.__gsiInitialized = true;
        }
        return true;
    };
    window.Utils = {
        toastState,
        showToast,
        hideToast,
        getRoleBadgeInfo,
        formatModuleName,
        formatStatusText,
        getStatusBadgeClass,
        getStatusDotClass,
        getStatusTextClass,
        getStatusIndicatorClass,
        formatStatusMeta,
        formatOperationType,
        formatInventoryStatus,
        formatTransportLeg,
        formatTripType,
        formatTripStatus,
        formatStopStatus,
        formatLocationCode,
        isHubLocation,
        isPostOfficeLocation,
        getOperationId,
        createOperationId,
        formatTime,
        formatDateTime: formatTime,
        formatCurrency,
        formatNodeText,
        formatJson,
        formatEtaDateRange,
        getEffectiveEta,
        maskPhone,
        isValidImageUrl,
        formatAvatarUrl
    };
})();
