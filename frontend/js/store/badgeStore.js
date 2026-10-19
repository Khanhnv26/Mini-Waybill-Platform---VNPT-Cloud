import { reactive, computed } from 'vue';

const state = reactive({
    support: 0,
    payments: 0,
    shipper: 0,
    shipment: 0
});

let refreshTimer = null;
let isRefreshing = false;

export const badgeStore = {
    state,

    getBadge(tabId) {
        if (tabId === 'support') {
            const chatUnread = Object.values(window.SupportChatRuntime?.state.unread || {}).reduce((sum, count) => sum + count, 0);
            const count = chatUnread || state.support || 0;
            if (count <= 0) return null;
            return {
                count,
                colorClass: 'bg-blue-600',
                title: `${count} tin nhắn hỗ trợ chưa đọc`
            };
        }
        if (tabId === 'payments') {
            const count = state.payments || 0;
            if (count <= 0) return null;
            return {
                count,
                colorClass: 'bg-amber-500',
                title: `${count} giao dịch chờ thu tiền`
            };
        }
        if (tabId === 'shipment') {
            const count = state.shipment || 0;
            if (count <= 0) return null;
            return {
                count,
                colorClass: 'bg-rose-500',
                title: `${count} vận đơn có sự cố / chuyển hoàn`
            };
        }
        if (tabId === 'shipper') {
            const count = state.shipper || 0;
            if (count <= 0) return null;
            return {
                count,
                colorClass: 'bg-blue-600',
                title: `${count} đơn hàng cần đi phát`
            };
        }
        return null;
    },

    async refreshBadges(currentUser = null) {
        if (isRefreshing) return;
        if (typeof window === 'undefined') return;
        if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;

        isRefreshing = true;
        try {
            const user = currentUser || window.authStore?.currentUser || (typeof Auth !== 'undefined' && Auth.getUser && Auth.getUser());
            if (!user) {
                state.payments = 0;
                state.shipper = 0;
                state.shipment = 0;
                state.support = 0;
                return;
            }

            const isInternal = typeof Auth !== 'undefined' && Auth.isInternalStaff && Auth.isInternalStaff();
            const isShipper = typeof Auth !== 'undefined' && Auth.isShipper && Auth.isShipper();

            if (window.PaymentService && typeof window.PaymentService.getStats === 'function') {
                try {
                    const customerCode = (!isInternal && !isShipper) ? user.customerCode : null;
                    const stats = await window.PaymentService.getStats(customerCode);
                    if (stats && typeof stats.pendingCount === 'number') {
                        state.payments = stats.pendingCount;
                    }
                } catch (e) {}
            }

            if (window.ShipmentService && typeof window.ShipmentService.getPendingFailureDecisions === 'function') {
                try {
                    const decisions = await window.ShipmentService.getPendingFailureDecisions();
                    if (Array.isArray(decisions)) {
                        state.shipment = decisions.length;
                    }
                } catch (e) {}
            }

            if (isShipper && window.ShipmentService && typeof window.ShipmentService.getAll === 'function') {
                try {
                    const allShipments = await window.ShipmentService.getAll();
                    if (Array.isArray(allShipments)) {
                        const pendingOrders = allShipments.filter(s => {
                            const st = (s.currentStatus || s.status || '').toUpperCase();
                            return st === 'OUT_FOR_DELIVERY' || st === 'ARRIVED_DEST_HUB';
                        });
                        state.shipper = pendingOrders.length;
                    }
                } catch (e) {}
            } else if (!isShipper) {
                state.shipper = 0;
            }
        } finally {
            isRefreshing = false;
        }
    },

    startPolling(currentUser = null) {
        this.stopPolling();
        this.refreshBadges(currentUser);
        refreshTimer = setInterval(() => {
            this.refreshBadges(currentUser);
        }, 60000);
    },

    stopPolling() {
        if (refreshTimer) {
            clearInterval(refreshTimer);
            refreshTimer = null;
        }
    }
};

if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            badgeStore.refreshBadges();
        }
    });
}

if (typeof window !== 'undefined') {
    window.badgeStore = badgeStore;
}
