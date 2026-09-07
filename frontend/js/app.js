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

            // 1.1. Danh mục tiện ích công khai dành cho khách chưa đăng nhập (Hướng B)
            const publicGuestTabs = [
                {
                    id: 'tracking',
                    name: 'Tra Cứu Bưu Gửi',
                    icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'
                },
                {
                    id: 'network',
                    name: 'Mạng Lưới Hub / Bưu Cục',
                    icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z'
                },
                {
                    id: 'calculator',
                    name: 'Ước Tính Cước Phí',
                    icon: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z'
                },
                {
                    id: 'guide',
                    name: 'Cẩm Nang & Quy Định',
                    icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253'
                },
                {
                    id: 'support',
                    name: 'Hỗ Trợ & Khiếu Nại',
                    icon: 'M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z'
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

            // Tiêu đề tab hiện tại hiển thị trên Breadcrumb
            const currentTabTitle = computed(() => {
                const foundNav = allNavigationTabs.find(t => t.id === currentTab.value);
                if (foundNav) return foundNav.name;
                const foundGuest = publicGuestTabs.find(t => t.id === currentTab.value);
                if (foundGuest) return foundGuest.name;
                return 'Hệ Thống';
            });

            // Xử lý khi khách vãng lai bấm các tiện ích ở sidebar (Hướng B)
            const handleGuestTabClick = (tab) => {
                if (tab.id === 'tracking') {
                    currentTab.value = 'tracking';
                } else if (tab.id === 'network') {
                    currentTab.value = 'tracking';
                    setTimeout(() => {
                        const el = document.getElementById('network-corridor-section');
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }, 50);
                } else if (tab.id === 'calculator') {
                    if (window.Utils && window.Utils.showToast) {
                        window.Utils.showToast('Ước Tính Cước Phí', 'Cước bưu gửi tiêu chuẩn: 15.000đ/kg đầu tiên, +5.000đ cho mỗi 500g tiếp theo. Tuyến Express: 25.000đ/kg.', 'info');
                    } else {
                        alert('Cước bưu gửi tiêu chuẩn: 15.000đ/kg đầu tiên. Express: 25.000đ/kg.');
                    }
                } else if (tab.id === 'guide') {
                    currentTab.value = 'tracking';
                    setTimeout(() => {
                        const el = document.getElementById('guide-section');
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }, 50);
                } else if (tab.id === 'support') {
                    if (window.Utils && window.Utils.showToast) {
                        window.Utils.showToast('Tổng Đài CSKH 24/7', 'Hotline miễn cước: 1900 54 54 81 - Tiếp nhận tra cứu bưu gửi và giải quyết khiếu nại.', 'info');
                    } else {
                        alert('Hotline CSKH VNPT: 1900 54 54 81 (24/7)');
                    }
                }
            };

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
                currentTabTitle,
                isSidebarCollapsed,
                toggleSidebarCollapse,
                navigationTabs,
                publicGuestTabs,
                handleGuestTabClick,
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
