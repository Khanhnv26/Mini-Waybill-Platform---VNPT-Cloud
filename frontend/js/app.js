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

            // 1. Danh bạ toàn bộ Tabs nghiệp vụ trong hệ thống kèm mã Permission tương ứng
            const allNavigationTabs = [
                { 
                    id: 'tracking', 
                    name: 'Tra Cứu Bưu Gửi', 
                    component: 'TrackingView', 
                    permission: null // Public: Khách vãng lai cũng xem được
                },
                { 
                    id: 'shipment', 
                    name: 'Khởi Tạo Vận Đơn', 
                    component: 'ShipmentView', 
                    permission: 'shipment:create' // Khách hàng & Admin
                },
                { 
                    id: 'hub-ops', 
                    name: 'Tác Nghiệp Kho Bãi', 
                    component: 'HubOpsView', 
                    permission: 'tracking:update_hub' // Thủ kho Hub & Admin
                },
                { 
                    id: 'shipper', 
                    name: 'Bưu Tá Giao Vận', 
                    component: 'ShipperView', 
                    permission: 'tracking:update_delivery' // Bưu tá & Admin
                },
                { 
                    id: 'dispatch-sim', 
                    name: 'Điều Phối & Mô Phỏng', 
                    component: 'DispatchSimulationView', 
                    role: 'ROLE_ADMIN' // Chỉ Quản trị viên
                },
                { 
                    id: 'customers', 
                    name: 'Danh Bạ Khách Hàng', 
                    component: 'CustomerView', 
                    permission: 'user:read' // CS & Admin
                },
                { 
                    id: 'rbac', 
                    name: 'Quản Trị Hệ Thống & RBAC', 
                    component: 'AdminRbacView', 
                    permission: 'user:assign_role' // Chỉ Admin (hoặc có quyền assign_role)
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
                                'Chức năng điều phối mô phỏng chỉ dành riêng cho Quản trị viên hệ thống!', 
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
                navigationTabs,
                activeComponent,
                currentTrackingCode,
                selectedCustomerForShipment,
                switchTab,
                handleShipmentCreated,
                handleCreateShipmentFor,
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
