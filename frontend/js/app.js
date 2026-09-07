/**
 * ==============================================================================
 * VNPT CLOUD - MASTER LAYOUT APPLICATION ENTRY POINT
 * Khởi Tạo Ứng Dụng Vue 3, Điều Phối Dynamic Tabs, Route Guard & Phân Quyền
 * ==============================================================================
 */

(function () {
    const { createApp, ref, computed, onMounted } = Vue;

    const app = createApp({
        setup() {
            const currentUser = ref(null);
            const currentTab = ref('tracking');
            const currentTrackingCode = ref('');
            const selectedCustomerForShipment = ref(null);
            const isSidebarCollapsed = ref(false);
            const toggleSidebarCollapse = () => {
                isSidebarCollapsed.value = !isSidebarCollapsed.value;
            };

            // 1. Danh bạ toàn bộ Tabs nghiệp vụ trong hệ thống kèm mã Permission tương ứng
            const allNavigationTabs = [
                { 
                    id: 'tracking', 
                    name: 'Tra Cứu Bưu Gửi', 
                    component: 'TrackingView', 
                    permission: null, // Public: Khách vãng lai cũng xem được
                    icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'
                },
                { 
                    id: 'shipment', 
                    name: 'Khởi Tạo Vận Đơn', 
                    component: 'ShipmentView', 
                    permission: 'shipment:create', // Khách hàng & Admin
                    icon: 'M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
                },
                { 
                    id: 'hub-ops', 
                    name: 'Tác Nghiệp Kho Bãi', 
                    component: 'HubOpsView', 
                    permission: 'tracking:update_hub', // Thủ kho Hub & Admin
                    icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4'
                },
                { 
                    id: 'shipper', 
                    name: 'Bưu Tá Giao Vận', 
                    component: 'ShipperView', 
                    permission: 'tracking:update_delivery', // Bưu tá & Admin
                    icon: 'M13 10V3L4 14h7v7l9-11h-7z'
                },
                { 
                    id: 'customers', 
                    name: 'Danh Bạ Khách Hàng', 
                    component: 'CustomerView', 
                    permission: 'user:read', // CS & Admin
                    icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z'
                },
                { 
                    id: 'rbac', 
                    name: 'Quản Trị Hệ Thống & RBAC', 
                    component: 'AdminRbacView', 
                    permission: 'user:assign_role', // Chỉ Admin (hoặc có quyền assign_role)
                    icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z'
                }
            ];

            // 2. Dynamic Navigation: Chỉ hiển thị các Tab mà tài khoản có quyền truy cập
            const navigationTabs = computed(() => {
                return allNavigationTabs.filter(tab => {
                    if (tab.role) {
                        if (typeof Auth === 'undefined') return false;
                        return Auth.hasRole(tab.role);
                    }
                    if (!tab.permission) return true; // Tab công khai
                    if (typeof Auth === 'undefined') return false;
                    return Auth.hasPermission(tab.permission);
                });
            });

            // 3. View Component động tương ứng với tab được chọn
            const activeComponent = computed(() => {
                const found = allNavigationTabs.find(t => t.id === currentTab.value);
                return found ? found.component : 'TrackingView';
            });

            // 4. Route Guard: Kiểm tra bảo mật khi chuyển tab
            const switchTab = (tabId) => {
                const targetTab = allNavigationTabs.find(t => t.id === tabId);
                if (!targetTab) return;

                if (targetTab.role) {
                    if (typeof Auth === 'undefined' || !Auth.hasRole(targetTab.role)) {
                        if (window.Utils && window.Utils.showToast) {
                            window.Utils.showToast(
                                'Truy Cập Bị Chặn (403)', 
                                'Chức năng này chỉ dành riêng cho Quản trị viên hệ thống!', 
                                'error'
                            );
                        } else {
                            alert('Quyền truy cập bị từ chối: Dành riêng cho Quản trị viên!');
                        }
                        return;
                    }
                }

                // Nếu tab yêu cầu quyền mà tài khoản không có -> Chặn ngay lập tức
                if (targetTab.permission) {
                    if (typeof Auth === 'undefined' || !Auth.hasPermission(targetTab.permission)) {
                        if (window.Utils && window.Utils.showToast) {
                            window.Utils.showToast(
                                'Truy Cập Bị Chặn (403)', 
                                'Tài khoản của bạn không có quyền truy cập tab này!', 
                                'error'
                            );
                        } else {
                            alert('Quyền truy cập bị từ chối: Bạn không có quyền vào tab này!');
                        }
                        return;
                    }
                }
                currentTab.value = tabId;
            };

            // Khi tạo vận đơn thành công ở ShipmentView, nhận sự kiện và chuyển sang Tra Cứu
            const handleShipmentCreated = (trackingCode) => {
                currentTrackingCode.value = trackingCode;
                selectedCustomerForShipment.value = null;
                currentTab.value = 'tracking';
            };

            // Khi chọn tạo vận đơn nhanh cho đối tác từ CustomerView
            const handleCreateShipmentFor = (customer) => {
                selectedCustomerForShipment.value = customer;
                switchTab('shipment');
            };

            const handleLogoClick = () => {
                if (isSidebarCollapsed.value) {
                    isSidebarCollapsed.value = false;
                } else {
                    switchTab('tracking');
                }
            };

            const handleLogout = () => {
                if (typeof Auth !== 'undefined') {
                    Auth.logout();
                } else {
                    localStorage.clear();
                    window.location.href = 'login.html';
                }
            };

            onMounted(() => {
                // Kiểm tra trạng thái đăng nhập
                if (typeof Auth !== 'undefined') {
                    currentUser.value = Auth.getUser();

                    // Đảm bảo tab ban đầu hợp lệ với quyền của người dùng
                    const currentTabObj = allNavigationTabs.find(t => t.id === currentTab.value);
                    if (currentTabObj && currentTabObj.permission && !Auth.hasPermission(currentTabObj.permission)) {
                        currentTab.value = 'tracking';
                    }
                }
            });

            return {
                currentUser,
                currentTab,
                isSidebarCollapsed,
                toggleSidebarCollapse,
                navigationTabs,
                activeComponent,
                currentTrackingCode,
                selectedCustomerForShipment,
                switchTab,
                handleShipmentCreated,
                handleCreateShipmentFor,
                handleLogoClick,
                handleLogout,
                toast: window.Utils ? window.Utils.toastState : { show: false },
                getRoleBadgeInfo: window.Utils ? window.Utils.getRoleBadgeInfo : () => ({ label: 'NHÂN VIÊN', class: 'bg-slate-50' })
            };
        }
    });

    // Đăng ký các View Components
    if (window.TrackingView) app.component('TrackingView', window.TrackingView);
    if (window.ShipmentView) app.component('ShipmentView', window.ShipmentView);
    if (window.HubOpsView) app.component('HubOpsView', window.HubOpsView);
    if (window.ShipperView) app.component('ShipperView', window.ShipperView);
    if (window.DispatchSimulationView) app.component('DispatchSimulationView', window.DispatchSimulationView);
    if (window.CustomerView) app.component('CustomerView', window.CustomerView);
    if (window.AdminRbacView) app.component('AdminRbacView', window.AdminRbacView);

    // Gắn ứng dụng vào DOM
    app.mount('#app');
})();
