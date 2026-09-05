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

    // Chuẩn hóa thông tin hiển thị của từng Vai Trò (Role)
    const getRoleBadgeInfo = (roleName) => {
        switch (roleName) {
            case 'ROLE_ADMIN':
                return {
                    label: 'Quản Trị Viên',
                    code: 'ADMIN',
                    class: 'bg-rose-50 text-rose-700 border-rose-200',
                    dotClass: 'bg-rose-500'
                };
            case 'ROLE_CS':
                return {
                    label: 'Chăm Sóc KH',
                    code: 'CS',
                    class: 'bg-purple-50 text-purple-700 border-purple-200',
                    dotClass: 'bg-purple-500'
                };
            case 'ROLE_HUB_OPERATOR':
                return {
                    label: 'Thủ Kho Hub',
                    code: 'HUB',
                    class: 'bg-indigo-50 text-indigo-700 border-indigo-200',
                    dotClass: 'bg-indigo-500'
                };
            case 'ROLE_SHIPPER':
                return {
                    label: 'Bưu Tá Phát',
                    code: 'SHIPPER',
                    class: 'bg-amber-50 text-amber-700 border-amber-200',
                    dotClass: 'bg-amber-500'
                };
            case 'ROLE_CUSTOMER':
                return {
                    label: 'Khách Hàng',
                    code: 'CUSTOMER',
                    class: 'bg-blue-50 text-blue-700 border-blue-200',
                    dotClass: 'bg-blue-500'
                };
            default:
                return {
                    label: roleName ? roleName.replace('ROLE_', '') : 'KHÁCH',
                    code: roleName || 'GUEST',
                    class: 'bg-slate-50 text-slate-600 border-slate-200',
                    dotClass: 'bg-slate-400'
                };
        }
    };

    // Chuẩn hóa trạng thái bưu gửi theo quy chuẩn Bưu chính Quốc gia
    const formatStatusText = (status) => {
        switch (status) {
            case 'CREATED': return 'Tiếp nhận đơn hàng';
            case 'PENDING_ROUTING': return 'Chờ định tuyến bưu cục';
            case 'ROUTE_ASSIGNED': return 'Đã định tuyến luân chuyển';
            case 'PICKED_UP': return 'Đã lấy hàng từ người gửi';
            case 'IN_TRANSIT': return 'Đang vận chuyển liên tỉnh';
            case 'ARRIVED_DEST_HUB': return 'Đã nhập bưu cục phát';
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
        if (node.includes('ROUTE-')) {
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
        formatStatusText,
        getStatusBadgeClass,
        formatTime,
        formatCurrency,
        formatNodeText,
        formatJson
    };
})();
