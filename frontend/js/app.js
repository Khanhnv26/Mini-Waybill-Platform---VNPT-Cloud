/**
 * VNPT CLOUD - MASTER LAYOUT APPLICATION ENTRY POINT
 * Khởi tạo ứng dụng Vue 3, điều phối các màn hình nghiệp vụ và quản lý trạng thái phiên
 */

(function () {
    const { createApp, ref, computed, onMounted } = Vue;

    const app = createApp({
        setup() {
            const currentUser = ref(null);
            const currentTab = ref('tracking');
            const currentTrackingCode = ref('');

            // Danh bạ 3 tab nghiệp vụ chính
            const navigationTabs = [
                { id: 'tracking', name: 'Tra Cứu Bưu Gửi', component: 'TrackingView' },
                { id: 'shipment', name: 'Tạo Vận Đơn', component: 'ShipmentView' },
                { id: 'customers', name: 'Quản Lý Khách Hàng', component: 'CustomerView' }
            ];

            // Thành phần view hiện tại tương ứng với tab được chọn
            const activeComponent = computed(() => {
                const found = navigationTabs.find(t => t.id === currentTab.value);
                return found ? found.component : 'TrackingView';
            });

            const switchTab = (tabId) => {
                currentTab.value = tabId;
            };

            // Khi tạo vận đơn thành công ở ShipmentView, nhận sự kiện và chuyển sang Tra Cứu
            const handleShipmentCreated = (trackingCode) => {
                currentTrackingCode.value = trackingCode;
                currentTab.value = 'tracking';
            };

            const handleLogout = () => {
                if (typeof Auth !== 'undefined') {
                    Auth.clearSession();
                } else {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                }
                window.location.href = 'login.html';
            };

            onMounted(() => {
                // Kiểm tra trạng thái đăng nhập
                if (typeof Auth !== 'undefined') {
                    currentUser.value = Auth.getUser();
                } else {
                    const userJson = localStorage.getItem('user');
                    if (userJson) {
                        try { currentUser.value = JSON.parse(userJson); } catch {}
                    }
                }
            });

            return {
                currentUser,
                currentTab,
                navigationTabs,
                activeComponent,
                currentTrackingCode,
                switchTab,
                handleShipmentCreated,
                handleLogout,
                toast: window.Utils ? window.Utils.toastState : { show: false }
            };
        }
    });

    // Đăng ký các View Components
    if (window.TrackingView) app.component('TrackingView', window.TrackingView);
    if (window.ShipmentView) app.component('ShipmentView', window.ShipmentView);
    if (window.CustomerView) app.component('CustomerView', window.CustomerView);

    // Gắn ứng dụng vào DOM
    app.mount('#app');
})();
