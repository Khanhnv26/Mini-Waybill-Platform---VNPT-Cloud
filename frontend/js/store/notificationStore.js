import { reactive } from 'vue';

const state = reactive({
    notifications: [],
    showDropdown: false,
    showDetailModal: false,
    activeDetail: null
});

const formatTime = (sentAt) => {
    if (!sentAt) return 'Vừa xong';
    try {
        const date = new Date(sentAt);
        if (isNaN(date.getTime())) return String(sentAt);
        const diffSeconds = Math.floor((Date.now() - date.getTime()) / 1000);
        if (diffSeconds < 60) return 'Vừa xong';
        if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)} phút trước`;
        if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)} giờ trước`;
        return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    } catch {
        return 'Vừa xong';
    }
};

const getVisuals = (title = '', message = '') => {
    const text = (title + ' ' + message).toUpperCase();
    if (text.includes('THANH TOÁN') || text.includes('VIETQR') || text.includes('CƯỚC') || text.includes('COD') || text.includes('TIỀN')) {
        return {
            icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
            iconBg: 'bg-emerald-600'
        };
    }
    if (text.includes('DELIVERED') || text.includes('THÀNH CÔNG')) {
        return {
            icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
            iconBg: 'bg-emerald-600'
        };
    }
    if (text.includes('FAILED') || text.includes('THẤT BẠI') || text.includes('HỦY') || text.includes('RETURNING')) {
        return {
            icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
            iconBg: 'bg-rose-600'
        };
    }
    if (text.includes('OUT_FOR_DELIVERY') || text.includes('BƯU TÁ') || text.includes('GIAO HÀNG')) {
        return {
            icon: 'M13 10V3L4 14h7v7l9-11h-7z',
            iconBg: 'bg-amber-600'
        };
    }
    return {
        icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
        iconBg: 'bg-blue-600'
    };
};

export const notificationStore = {
    state,

    get notifications() { return state.notifications; },
    get unreadCount() { return state.notifications.filter(n => !n.isRead).length; },
    get showDropdown() { return state.showDropdown; },
    get showDetailModal() { return state.showDetailModal; },
    get activeDetail() { return state.activeDetail; },

    toggleDropdown() {
        state.showDropdown = !state.showDropdown;
    },

    closeDropdown() {
        state.showDropdown = false;
    },

    async fetchNotifications() {
        if (typeof window.NotificationService === 'undefined' || !window.NotificationService.getMyNotifications) return;
        try {
            const list = await window.NotificationService.getMyNotifications();
            if (Array.isArray(list)) {
                state.notifications = list.map(item => {
                    const visuals = getVisuals(item.title, item.message);
                    return {
                        id: item.id,
                        title: item.title || 'Thông báo hệ thống',
                        message: item.message || '',
                        trackingCode: item.trackingCode || null,
                        time: formatTime(item.sentAt),
                        isRead: !!item.isRead,
                        icon: visuals.icon,
                        iconBg: visuals.iconBg
                    };
                });
            }
        } catch (err) {
            console.warn('[notificationStore] Lỗi tải thông báo:', err);
        }
    },

    async markAllAsRead() {
        try {
            if (window.NotificationService && window.NotificationService.markAllAsRead) {
                await window.NotificationService.markAllAsRead();
            }
            state.notifications.forEach(n => { n.isRead = true; });
        } catch (err) {
            console.warn('[notificationStore] Lỗi đánh dấu đã đọc:', err);
        }
    },

    openDetail(item, entityCode = null, type = 'GENERAL') {
        state.activeDetail = {
            ...item,
            entityCode: entityCode || item.trackingCode || null,
            detailType: type
        };
        state.showDetailModal = true;
        this.closeDropdown();
    },

    closeDetail() {
        state.showDetailModal = false;
        state.activeDetail = null;
    }
};
