/**
 * ==============================================================================
 * VNPT CLOUD - MASTER LAYOUT APPLICATION ENTRY POINT
 * Khởi Tạo Ứng Dụng Vue 3, Điều Phối Dynamic Tabs, Route Guard & Phân Quyền
 * ==============================================================================
 */

(function () {
    const { createApp, ref, reactive, computed, onMounted } = Vue;

    const app = createApp({
        setup() {
            const currentUser = ref(null);
            const currentTab = ref('tracking');
            const currentTrackingCode = ref('');
            const previousTab = ref(null);
            const selectedCustomerForShipment = ref(null);
            const isSidebarCollapsed = ref(true);
            const showUserProfileModal = ref(false);
            const userProfile = ref(null);
            const isLoadingUserProfile = ref(false);
            const isSavingUserProfile = ref(false);
            const profileFormData = reactive({
                fullName: '',
                phoneNumber: '',
                address: ''
            });
            const stationFieldNames = ['locationCode', 'postOfficeCode', 'hubCode'];
            const profileStorageFields = ['fullName', 'phoneNumber', 'address', ...stationFieldNames];

            const normalizeStationCode = (value) => {
                if (typeof value !== 'string' && typeof value !== 'number') return '';
                return String(value).trim();
            };

            const readStoredObject = (key) => {
                try {
                    const raw = localStorage.getItem(key);
                    if (!raw) return null;
                    const parsed = JSON.parse(raw);
                    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
                } catch (err) {
                    return null;
                }
            };

            const getStationFields = (...sources) => {
                const context = {
                    locationCode: '',
                    postOfficeCode: '',
                    hubCode: ''
                };

                sources.forEach(source => {
                    if (!source || typeof source !== 'object') return;
                    stationFieldNames.forEach(field => {
                        if (!context[field]) {
                            context[field] = normalizeStationCode(source[field]);
                        }
                    });
                });

                return context;
            };

            const getProfileStoragePatch = (source) => {
                const patch = {};
                if (!source || typeof source !== 'object') return patch;

                profileStorageFields.forEach(field => {
                    if (!Object.prototype.hasOwnProperty.call(source, field)) return;
                    if (stationFieldNames.includes(field)) {
                        const value = normalizeStationCode(source[field]);
                        if (value) patch[field] = value;
                        return;
                    }

                    const value = typeof source[field] === 'string'
                        ? source[field].trim()
                        : source[field];
                    if (value !== undefined && value !== null && value !== '') {
                        patch[field] = value;
                    }
                });

                return patch;
            };

            const persistUserProfilePatch = (patch) => {
                if (!patch || Object.keys(patch).length === 0 || typeof localStorage === 'undefined') return;

                try {
                    const canonicalUser = readStoredObject('user') || (currentUser.value ? { ...currentUser.value } : null);
                    const nextUser = canonicalUser ? { ...canonicalUser, ...patch } : null;
                    if (nextUser) {
                        localStorage.setItem('user', JSON.stringify(nextUser));
                    }

                    // auth_user is retained as a legacy mirror; Auth continues to own authentication via user/accessToken.
                    const legacyUser = readStoredObject('auth_user');
                    const nextLegacyUser = legacyUser || nextUser;
                    if (nextLegacyUser) {
                        localStorage.setItem('auth_user', JSON.stringify({ ...nextLegacyUser, ...patch }));
                    }
                } catch (err) {
                    console.warn('[app.js] Không thể đồng bộ hồ sơ người dùng:', err);
                }
            };

            const syncProfileToCurrentUser = (source, persist = false) => {
                const patch = getProfileStoragePatch(source);
                if (currentUser.value && Object.keys(patch).length > 0) {
                    currentUser.value = { ...currentUser.value, ...patch };
                }
                if (persist) {
                    persistUserProfilePatch(patch);
                }
            };

            const stationContext = computed(() => {
                const context = getStationFields(currentUser.value, userProfile.value);
                const primaryCode = context.locationCode || context.postOfficeCode || context.hubCode;
                return {
                    ...context,
                    primaryCode,
                    hasStation: Boolean(primaryCode)
                };
            });

            const stationDisplayData = computed(() => {
                const context = stationContext.value;
                const labels = [];
                if (context.locationCode) labels.push(`Vị trí: ${context.locationCode}`);
                if (context.postOfficeCode) labels.push(`Bưu cục: ${context.postOfficeCode}`);
                if (context.hubCode) labels.push(`Hub: ${context.hubCode}`);

                return {
                    ...context,
                    code: context.primaryCode,
                    label: context.primaryCode || 'Chưa phân công trạm',
                    summary: labels.join(' · ') || 'Chưa phân công trạm'
                };
            });

            const activateTab = (tabId) => {
                if (tabId !== 'tracking') {
                    currentTrackingCode.value = '';
                }
                currentTab.value = tabId;
            };


            const toggleSidebarCollapse = () => {
                isSidebarCollapsed.value = !isSidebarCollapsed.value;
                setTimeout(() => {
                    if (window.MapManager) {
                        window.MapManager.invalidateSize();
                    }
                }, 300);
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
                    id: 'trips', 
                    name: 'Quản Lý Chuyến Xe', 
                    component: 'TripsView', 
                    permission: 'routing:trip_manage', // Điều phối viên Vận tải (ROLE_DISPATCHER) & Admin
                    icon: 'M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8h4.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h2a1 1 0 001-1'
                },
                { 
                    id: 'post-office', 
                    name: 'Khai Thác Bưu Cục', 
                    component: 'PostOfficeOpsView', 
                    permission: 'tracking:update_post_office', // Giao dịch viên bưu cục & Admin
                    icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4'
                },
                { 
                    id: 'hub-ops', 
                    name: 'Khai Thác Kho Tổng', 
                    component: 'HubOpsView', 
                    permission: 'tracking:update_hub', // Thủ kho Hub & Admin
                    icon: 'M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z'
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

            // Quản lý tính năng tiện ích công khai đang được chọn (UnderDevelopmentView)
            const currentFeatureId = ref('network');

            // Xử lý khi khách vãng lai bấm các tiện ích ở sidebar (Hướng B)
            const handleGuestTabClick = (tab) => {
                if (tab.id === 'tracking') {
                    activateTab('tracking');
                } else {
                    activateTab(tab.id);
                    currentFeatureId.value = tab.id;
                }
            };

            // Quay lại trang Tra Cứu chính từ màn hình Đang Phát Triển
            const handleBackToHome = () => {
                activateTab('tracking');
            };

            // 3. View Component động tương ứng với tab được chọn
            const activeComponent = computed(() => {
                if (['network', 'calculator', 'guide', 'support'].includes(currentTab.value)) {
                    return 'UnderDevelopmentView';
                }
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
                previousTab.value = null; // Người dùng chủ động chuyển tab từ sidebar -> xóa lịch sử quay lại
                if (tabId !== 'shipment') {
                    selectedCustomerForShipment.value = null;
                }
                activateTab(tabId)
            };

            // Khi click xem chi tiết vận đơn từ bất kỳ màn hình nào (Kho, Bưu tá, Khởi tạo, Điều phối)
            const handleViewTracking = (trackingCode, sourceTabId = null) => {
                if (!trackingCode) return;
                const srcId = sourceTabId || currentTab.value;
                const srcObj = allNavigationTabs.find(t => t.id === srcId);
                previousTab.value = srcObj ? { id: srcObj.id, name: srcObj.name } : null;
                currentTrackingCode.value = trackingCode.trim();
                selectedCustomerForShipment.value = null;
                activateTab('tracking');
            };

            // Khi người dùng bấm nút "Quay lại trang trước" từ TrackingView
            const handleBackToPreviousTab = () => {
                if (previousTab.value && previousTab.value.id) {
                    activateTab(previousTab.value.id);
                }
                previousTab.value = null;
            };

            // Khi tạo vận đơn thành công ở ShipmentView, nhận sự kiện và chuyển sang Tra Cứu
            const handleShipmentCreated = (trackingCode) => {
                selectedCustomerForShipment.value = null;
                handleViewTracking(trackingCode, 'shipment');
            };

            // Khi chọn tạo vận đơn nhanh cho đối tác từ CustomerView
            const handleCreateShipmentFor = (customer) => {
                if (!customer || customer.status !== 'ACTIVE') {
                    if (window.Utils && window.Utils.showToast) {
                        window.Utils.showToast('Không Khả Dụng', 'Khách hàng đang ở trạng thái Tạm Dừng, không thể tạo vận đơn.', 'warning');
                    }
                    return;
                }
                selectedCustomerForShipment.value = customer;
                switchTab('shipment');
            };

            const handleLogoClick = () => {
                if (isSidebarCollapsed.value) {
                    isSidebarCollapsed.value = false;
                    setTimeout(() => {
                        if (window.MapManager) {
                            window.MapManager.invalidateSize();
                        }
                    }, 300);
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

            // 6. Quản Lý Hồ Sơ Cá Nhân & Thông Tin Shop (Global Profile Modal)
            const openUserProfileModal = async () => {
                if (typeof Auth === 'undefined' || !Auth.isAuthenticated()) {
                    window.location.href = 'login.html';
                    return;
                }
                showUserProfileModal.value = true;
                isLoadingUserProfile.value = true;
                try {
                    const prof = await CustomerService.getMyProfile();
                    if (prof) {
                        userProfile.value = prof;
                        syncProfileToCurrentUser(prof);
                        profileFormData.fullName = prof.fullName || currentUser.value?.fullName || '';
                        profileFormData.phoneNumber = prof.phoneNumber || '';
                        profileFormData.address = prof.address || '';
                    }
                } catch (err) {
                    console.warn('[app.js] Không thể tải hồ sơ khách hàng:', err);
                    profileFormData.fullName = currentUser.value?.fullName || '';
                } finally {
                    isLoadingUserProfile.value = false;
                }
            };

            const closeUserProfileModal = () => {
                showUserProfileModal.value = false;
            };

            const saveUserProfile = async () => {
                if (!profileFormData.fullName.trim()) {
                    Utils.showToast('Thiếu Thông Tin', 'Vui lòng nhập Họ tên hoặc Tên cửa hàng', 'warning');
                    return;
                }
                isSavingUserProfile.value = true;
                try {
                    const updated = await CustomerService.updateMyProfile({
                        fullName: profileFormData.fullName.trim(),
                        phoneNumber: profileFormData.phoneNumber.trim(),
                        address: profileFormData.address.trim()
                    });
                    const updatedProfile = updated && typeof updated === 'object' ? updated : {
                        fullName: profileFormData.fullName.trim(),
                        phoneNumber: profileFormData.phoneNumber.trim(),
                        address: profileFormData.address.trim()
                    };
                    userProfile.value = updatedProfile;
                    syncProfileToCurrentUser(updatedProfile, true);

                    Utils.showToast('Thành Công', 'Đã cập nhật hồ sơ tài khoản!');
                    showUserProfileModal.value = false;
                } catch (err) {
                    Utils.showToast('Lỗi Cập Nhật', err.message || 'Không thể lưu hồ sơ', 'error');
                } finally {
                    isSavingUserProfile.value = false;
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
                stationContext,
                stationDisplayData,
                currentTab,
                currentTabTitle,
                previousTab,
                isSidebarCollapsed,
                toggleSidebarCollapse,
                navigationTabs,
                publicGuestTabs,
                handleGuestTabClick,
                activeComponent,
                currentTrackingCode,
                selectedCustomerForShipment,
                switchTab,
                handleViewTracking,
                handleBackToPreviousTab,
                handleShipmentCreated,
                handleCreateShipmentFor,
                handleLogoClick,
                handleLogout,
                currentFeatureId,
                handleBackToHome,
                // Profile Modal Global
                showUserProfileModal,
                userProfile,
                isLoadingUserProfile,
                isSavingUserProfile,
                profileFormData,
                openUserProfileModal,
                closeUserProfileModal,
                saveUserProfile,
                toast: window.Utils ? window.Utils.toastState : { show: false },
                getRoleBadgeInfo: window.Utils ? window.Utils.getRoleBadgeInfo : () => ({ label: 'NHÂN VIÊN', class: 'bg-slate-50' })
            };
        }
    });

    // Đăng ký các View Components
    if (window.TrackingView) app.component('TrackingView', window.TrackingView);
    if (window.ShipmentView) app.component('ShipmentView', window.ShipmentView);
    if (window.PostOfficeOpsView) app.component('PostOfficeOpsView', window.PostOfficeOpsView);
    if (window.HubOpsView) app.component('HubOpsView', window.HubOpsView);
    if (window.TripsView) app.component('TripsView', window.TripsView);
    if (window.ShipperView) app.component('ShipperView', window.ShipperView);
    if (window.DispatchSimulationView) app.component('DispatchSimulationView', window.DispatchSimulationView);
    if (window.CustomerView) app.component('CustomerView', window.CustomerView);
    if (window.AdminRbacView) app.component('AdminRbacView', window.AdminRbacView);
    if (window.UnderDevelopmentView) app.component('UnderDevelopmentView', window.UnderDevelopmentView);

    // Gắn ứng dụng vào DOM
    app.mount('#app');
})();
