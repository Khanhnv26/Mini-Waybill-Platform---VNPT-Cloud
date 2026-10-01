(function () {
    const { createApp, ref, reactive, computed, onMounted, onUnmounted } = Vue;

    const ROUTE_TAB_MAP = {
        '/': 'tracking',
        '/index.html': 'tracking',
        '/tracking': 'tracking',
        '/shipment': 'shipment',
        '/trips': 'trips',
        '/post-office': 'post-office',
        '/hub-ops': 'hub-ops',
        '/shipper': 'shipper',
        '/shipper-directory': 'shipper-directory',
        '/customer': 'customers',
        '/customers': 'customers',
        '/report': 'reports',
        '/reports': 'reports',
        '/tariff': 'calculator',
        '/calculator': 'calculator',
        '/network': 'network',
        '/guide': 'guide',
        '/support': 'support',
        '/admin-rbac': 'rbac',
        '/rbac': 'rbac',
        '/profile': 'profile',
        '/login': 'login',
        '/login.html': 'login',
        '/error': 'error',
        '/error.html': 'error'
    };

    const TAB_ROUTE_MAP = {
        'tracking': '/tracking',
        'shipment': '/shipment',
        'trips': '/trips',
        'post-office': '/post-office',
        'hub-ops': '/hub-ops',
        'shipper': '/shipper',
        'shipper-directory': '/shipper-directory',
        'customers': '/customer',
        'reports': '/report',
        'calculator': '/calculator',
        'network': '/network',
        'guide': '/guide',
        'support': '/support',
        'rbac': '/admin-rbac',
        'profile': '/profile',
        'login': '/login',
        'error': '/error'
    };

    const resolveRoute = (inputPath) => {
        let clean = inputPath || window.location.pathname;
        if (window.location.hash && (!inputPath || inputPath === window.location.pathname)) {
            const hash = window.location.hash.replace('#', '').trim();
            if (hash) {
                clean = '/' + hash;
            }
        }
        let pathname = clean.split('?')[0].toLowerCase().trim();
        if (pathname.length > 1 && pathname.endsWith('/')) {
            pathname = pathname.slice(0, -1);
        }
        if (ROUTE_TAB_MAP.hasOwnProperty(pathname)) {
            return { tab: ROUTE_TAB_MAP[pathname], path: pathname, notFound: false };
        }
        return { tab: 'error', path: pathname, notFound: true };
    };

    const app = createApp({
        setup() {
            const urlParams = new URLSearchParams(window.location.search);
            const initialCodeParam = parseInt(urlParams.get('code'), 10);
            const trackingQuery = urlParams.get('code') || urlParams.get('tracking');
            const initialRoute = resolveRoute(window.location.pathname);
            const hasInitialError = !isNaN(initialCodeParam) || initialRoute.notFound;

            const currentUser = ref(typeof Auth !== 'undefined' ? Auth.getUser() : null);
            // Bumped whenever the auth session changes (login/logout/profile sync)
            // so permission-gated menus recompute without a full page reload.
            const authVersion = ref(0);
            if (typeof window !== 'undefined') {
                window.addEventListener('auth:changed', () => {
                    currentUser.value = typeof Auth !== 'undefined' ? Auth.getUser() : null;
                    authVersion.value += 1;
                });
            }
            const currentTab = ref(hasInitialError ? 'error' : initialRoute.tab);
            const currentTrackingCode = ref(trackingQuery && !hasInitialError && initialRoute.tab !== 'error' ? trackingQuery.trim() : '');
            const currentErrorCode = ref(!isNaN(initialCodeParam) ? initialCodeParam : (initialRoute.notFound ? 404 : 200));
            const currentErrorTitle = ref(urlParams.get('title') || (initialRoute.notFound ? 'Không Tìm Thấy Trang Yêu Cầu' : ''));
            const currentErrorMessage = ref(urlParams.get('message') || (initialRoute.notFound ? `Đường dẫn "${window.location.pathname}" không tồn tại trên hệ thống máy chủ bưu chính VNPT.` : ''));
            const previousTab = ref(null);
            const selectedCustomerForShipment = ref(null);
            const selectedTariffForShipment = ref(null);
            const isSidebarCollapsed = ref(typeof window !== 'undefined' ? window.innerWidth < 1024 : false);
            if (typeof window !== 'undefined') {
                window.addEventListener('resize', () => {
                    if (window.innerWidth < 768 && !isSidebarCollapsed.value) {
                        isSidebarCollapsed.value = true;
                    }
                });
            }
            try {
                localStorage.removeItem('theme');
                document.documentElement.classList.remove('dark');
            } catch (e) {}
            const isDarkMode = ref(false);
            const toggleDarkMode = () => {};

            const showError = (code = 404, title = '', message = '') => {
                currentErrorCode.value = code;
                currentErrorTitle.value = title;
                currentErrorMessage.value = message;
                currentTab.value = 'error';
            };
            const showNotificationDropdown = ref(false);
            const notifications = ref([]);

            const formatNotificationTime = (sentAt) => {
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

            const getNotificationVisuals = (title = '', message = '') => {
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
                if (text.includes('PHÂN TUYẾN') || text.includes('HUB') || text.includes('CHUYẾN XE') || text.includes('ROUTE')) {
                    return {
                        icon: 'M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z',
                        iconBg: 'bg-purple-600'
                    };
                }
                return {
                    icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
                    iconBg: 'bg-blue-600'
                };
            };

            const isTripNotification = (item) => {
                if (!item) return false;
                const title = String(item.title || '').toLowerCase();
                const message = String(item.message || '').toLowerCase();
                const code = String(item.trackingCode || '').toUpperCase();
                if (title.includes('chuyến xe') || title.includes('gom đơn') || title.includes('chuyến') || title.includes('trip')) {
                    return true;
                }
                if (message.includes('chuyến xe') || message.includes('gom đơn') || message.includes('chuyến')) {
                    return true;
                }
                if (/^(TRIP|LH|OF|DF)/.test(code)) {
                    return true;
                }
                return false;
            };

            const extractTripCode = (item) => {
                if (!item) return '';
                if (item.trackingCode && item.trackingCode !== 'TRIP' && item.trackingCode !== 'SYSTEM') {
                    return String(item.trackingCode).trim();
                }
                if (item.message) {
                    const match = item.message.match(/Chuyến xe\s+([A-Za-z0-9_-]+)/i);
                    if (match && match[1] && match[1].toUpperCase() !== 'TRIP') {
                        return match[1].trim();
                    }
                }
                return item.trackingCode ? String(item.trackingCode).trim() : '';
            };

            const showNotificationDetailModal = ref(false);
            const activeNotificationDetail = ref(null);

            const openNotificationDetailModal = (item, entityCode = null, type = 'GENERAL') => {
                activeNotificationDetail.value = {
                    ...item,
                    entityCode: entityCode || item.trackingCode || null,
                    detailType: type
                };
                showNotificationDetailModal.value = true;
            };

            const closeNotificationDetailModal = () => {
                showNotificationDetailModal.value = false;
                activeNotificationDetail.value = null;
            };

            const handleNavigateToTripFromModal = (tripCode) => {
                closeNotificationDetailModal();
                currentTrackingCode.value = tripCode || '';
                switchTab('trips');
                setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('open-trip-by-code', {
                        detail: { tripCode }
                    }));
                }, 150);
            };

            const handleNavigateToTrackingFromModal = (trackingCode) => {
                closeNotificationDetailModal();
                handleViewTracking(trackingCode);
            };

            const fetchNotifications = async () => {
                if (typeof NotificationService === 'undefined' || !NotificationService.getMyNotifications) return;
                try {
                    const list = await NotificationService.getMyNotifications();
                    if (Array.isArray(list)) {
                        notifications.value = list.map(item => {
                            const visuals = getNotificationVisuals(item.title, item.message);
                            const isTrip = isTripNotification(item);
                            return {
                                id: item.id,
                                title: item.title || 'Thông báo hệ thống',
                                message: item.message || '',
                                trackingCode: item.trackingCode || null,
                                time: formatNotificationTime(item.sentAt),
                                isRead: !!item.isRead,
                                icon: visuals.icon,
                                iconBg: visuals.iconBg,
                                isTrip,
                                trackingLabel: isTrip ? 'Mã chuyến xe:' : 'Mã bưu gửi:'
                            };
                        });
                    }
                } catch (err) {
                    console.warn('[Notifications] Lỗi khi tải thông báo thực tế:', err);
                }
            };

            const unreadNotificationsCount = computed(() => {
                return notifications.value.filter(item => !item.isRead).length;
            });

            const toggleNotificationDropdown = (e) => {
                if (e) e.stopPropagation();
                showNotificationDropdown.value = !showNotificationDropdown.value;
            };

            const closeNotificationDropdown = () => {
                showNotificationDropdown.value = false;
            };

            const markAllNotificationsAsRead = async () => {
                notifications.value.forEach(item => {
                    item.isRead = true;
                });
                if (typeof NotificationService !== 'undefined' && NotificationService.markAllAsRead) {
                    NotificationService.markAllAsRead();
                }
                if (window.Utils && window.Utils.showToast) {
                    window.Utils.showToast('Thông Báo', 'Đã đánh dấu tất cả thông báo là đã đọc!', 'success');
                }
            };

            const handleNotificationClick = async (item) => {
                item.isRead = true;
                if (typeof NotificationService !== 'undefined' && NotificationService.markAsRead) {
                    NotificationService.markAsRead(item.id);
                }
                showNotificationDropdown.value = false;

                if (isTripNotification(item)) {
                    const tripCode = extractTripCode(item);
                    const canAccessTrips = typeof Auth !== 'undefined' && 
                        (Auth.hasPermission('routing:trip_manage') || Auth.hasRole('ADMIN') || Auth.isInternalStaff());

                    if (canAccessTrips) {
                        currentTrackingCode.value = tripCode;
                        switchTab('trips');
                        setTimeout(() => {
                            window.dispatchEvent(new CustomEvent('open-trip-by-code', {
                                detail: { tripCode }
                            }));
                        }, 120);
                        return;
                    }

                    openNotificationDetailModal(item, tripCode, 'TRIP');
                    return;
                }

                if (item.trackingCode && item.trackingCode !== 'SYSTEM') {
                    handleViewTracking(item.trackingCode);
                    return;
                }

                openNotificationDetailModal(item, null, 'GENERAL');
            };

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
            // Customer profile data is not an authorization source. Station
            // assignment comes from the authenticated user's JWT/response.
            const profileStorageFields = ['fullName', 'phoneNumber', 'address', 'avatarUrl', 'googleLinked'];

            const isStaffUser = computed(() => {
                if (!currentUser.value) return false;
                return typeof Auth !== 'undefined' && Auth.isInternalStaff();
            });

            const getRoleTitle = (role) => {
                return typeof Auth !== 'undefined' ? Auth.getRoleDisplayName(role) : (role || 'Khách Hàng');
            };

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
                const context = getStationFields(currentUser.value);
                const trustedLocation = typeof Auth !== 'undefined'
                    && typeof Auth.getLocationCode === 'function'
                    ? normalizeStationCode(Auth.getLocationCode())
                    : '';

                // Never let a customer profile or a client-edited station field
                // widen an operator's scope. The signed assignment is primary;
                // the local user object is only a compatibility fallback.
                context.locationCode = trustedLocation;
                context.postOfficeCode = trustedLocation.startsWith('POST-') ? trustedLocation : '';
                context.hubCode = trustedLocation.startsWith('HUB-') ? trustedLocation : '';

                const primaryCode = trustedLocation;
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
                if (tabId !== 'tracking' && tabId !== 'support') {
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

            const allNavigationTabs = [
                { 
                    id: 'tracking', 
                    name: 'Tra Cứu Bưu Gửi', 
                    component: 'TrackingView', 
                    permission: null,
                    icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'
                },
                { 
                    id: 'shipment', 
                    name: 'Khởi Tạo Vận Đơn', 
                    component: 'ShipmentView', 
                    permission: 'shipment:create',
                    icon: 'M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
                },
                { 
                    id: 'trips', 
                    name: 'Quản Lý Chuyến Xe', 
                    component: 'TripsView', 
                    permission: 'routing:trip_manage',
                    icon: 'M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8h4.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h2a1 1 0 001-1'
                },
                { 
                    id: 'post-office', 
                    name: 'Khai Thác Bưu Cục', 
                    component: 'PostOfficeOpsView', 
                    permission: 'tracking:update_post_office',
                    icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4'
                },
                { 
                    id: 'hub-ops', 
                    name: 'Khai Thác Hub Chia Chọn', 
                    component: 'HubOpsView', 
                    permission: 'tracking:update_hub',
                    icon: 'M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z'
                },
                { 
                    id: 'shipper', 
                    name: 'Bưu Tá Phát Hàng', 
                    component: 'ShipperView', 
                    permission: 'tracking:update_delivery',
                    icon: 'M13 10V3L4 14h7v7l9-11h-7z'
                },
                { 
                    id: 'customers', 
                    name: 'Danh Bạ Khách Hàng', 
                    component: 'CustomerView', 
                    permission: 'user:read',
                    icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z'
                },
                {
                    id: 'shipper-directory',
                    name: 'Danh Bạ Bưu Tá',
                    component: 'ShipperDirectoryView',
                    permission: 'user:assign_role',
                    icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'
                },
                { 
                    id: 'reports', 
                    name: 'Báo Cáo & Đối Soát', 
                    component: 'ReportView', 
                    permission: null,
                    icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'
                },
                { 
                    id: 'rbac', 
                    name: 'Quản Trị Hệ Thống & RBAC', 
                    component: 'AdminRbacView', 
                    permission: 'user:assign_role',
                    icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z'
                },
                { 
                    id: 'support', 
                    name: 'Hỗ Trợ & Khiếu Nại', 
                    component: 'SupportView', 
                    permission: null,
                    icon: 'M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z'
                },
                { 
                    id: 'profile', 
                    name: 'Hồ Sơ & Thiết Lập', 
                    component: 'ProfileView', 
                    permission: null,
                    icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'
                }
            ];

            const publicGuestTabs = [
                {
                    id: 'tracking',
                    name: 'Tra Cứu Bưu Gửi',
                    icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'
                },
                {
                    id: 'calculator',
                    name: 'Ước Tính Cước',
                    icon: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z'
                },
                {
                    id: 'network',
                    name: 'Mạng Lưới Bưu Cục',
                    icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z'
                },
                {
                    id: 'guide',
                    name: 'Cẩm Nang',
                    icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253'
                },
                {
                    id: 'support',
                    name: 'CSKH & Khiếu Nại',
                    icon: 'M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z'
                }
            ];

            const showPublicMobileMenu = ref(false);

            const navigationTabs = computed(() => {
                // Reactive dependencies: re-filter when the session/permissions change.
                void authVersion.value;
                void currentUser.value;
                return allNavigationTabs.filter(tab => {
                    if (tab.role) {
                        if (typeof Auth === 'undefined') return false;
                        return Auth.hasRole(tab.role);
                    }
                    if (!tab.permission) return true;
                    if (typeof Auth === 'undefined') return false;
                    return Auth.hasPermission(tab.permission);
                });
            });

            const currentTabTitle = computed(() => {
                if (currentTab.value === 'login') {
                    return 'Đăng Nhập';
                }
                if (currentTab.value === 'error') {
                    return currentErrorTitle.value || `Mã Trạng Thái ${currentErrorCode.value}`;
                }
                const foundNav = allNavigationTabs.find(t => t.id === currentTab.value);
                if (foundNav) return foundNav.name;
                const foundGuest = publicGuestTabs.find(t => t.id === currentTab.value);
                if (foundGuest) return foundGuest.name;
                return 'Hệ Thống';
            });

            const currentFeatureId = ref('network');

            const activeComponent = computed(() => {
                if (currentTab.value === 'login') {
                    return 'LoginView';
                }
                if (currentTab.value === 'error') {
                    return 'ErrorView';
                }
                if (currentTab.value === 'calculator') {
                    return 'TariffCalculatorView';
                }
                if (currentTab.value === 'network') {
                    return 'NetworkView';
                }
                if (currentTab.value === 'guide') {
                    return 'GuideView';
                }
                if (currentTab.value === 'support') {
                    return 'SupportView';
                }
                const found = allNavigationTabs.find(t => t.id === currentTab.value);
                return found ? found.component : 'TrackingView';
            });

            const navigateTo = (targetUrl, replace = false) => {
                if (!targetUrl) return;
                let url = String(targetUrl).trim();
                if (url.startsWith('index.html#')) {
                    url = '/' + url.replace('index.html#', '');
                } else if (url === 'login.html' || url.startsWith('login.html')) {
                    url = '/login';
                } else if (url === 'index.html' || url.startsWith('index.html')) {
                    url = '/tracking';
                } else if (url.startsWith('#')) {
                    url = '/' + url.slice(1);
                }

                const urlObj = new URL(url, window.location.origin);
                const resolved = resolveRoute(urlObj.pathname);

                const targetTab = allNavigationTabs.find(t => t.id === resolved.tab);
                if (!currentUser.value && targetTab && (targetTab.permission || targetTab.role)) {
                    try {
                        sessionStorage.setItem('redirectAfterLogin', urlObj.pathname + urlObj.search);
                    } catch (e) {}
                    if (window.Utils && window.Utils.showToast) {
                        window.Utils.showToast(
                            'Yêu Cầu Đăng Nhập',
                            'Vui lòng đăng nhập để truy cập tính năng ' + targetTab.name + '. Đang chuyển hướng...',
                            'info'
                        );
                    }
                    setTimeout(() => {
                        navigateTo('/login');
                    }, 300);
                    return;
                }

                if (resolved.tab === 'login' && currentUser.value) {
                    navigateTo('/tracking', true);
                    return;
                }

                if (targetTab && targetTab.role) {
                    if (typeof Auth === 'undefined' || !Auth.hasRole(targetTab.role)) {
                        showError(403, 'Quyền Truy Cập Bị Chặn (403)', 'Chức năng này chỉ dành riêng cho Quản trị viên hệ thống!');
                        return;
                    }
                }

                if (targetTab && targetTab.permission) {
                    if (typeof Auth === 'undefined' || !Auth.hasPermission(targetTab.permission)) {
                        showError(403, 'Truy Cập Bị Chặn (403)', 'Tài khoản của bạn không có quyền truy cập tab này!');
                        return;
                    }
                }

                const params = new URLSearchParams(urlObj.search);
                const code = params.get('code') || params.get('tracking');
                if (code) {
                    currentTrackingCode.value = code.trim();
                }

                const canonicalPath = TAB_ROUTE_MAP[resolved.tab] || urlObj.pathname;
                const finalUrl = canonicalPath + (urlObj.search || '');
                if (window.location.pathname + window.location.search !== finalUrl) {
                    if (replace) {
                        window.history.replaceState({ tab: resolved.tab }, '', finalUrl);
                    } else {
                        window.history.pushState({ tab: resolved.tab }, '', finalUrl);
                    }
                }

                if (resolved.notFound) {
                    showError(404, 'Không Tìm Thấy Trang Yêu Cầu', `Đường dẫn "${urlObj.pathname}" không tồn tại trên hệ thống máy chủ bưu chính VNPT.`);
                } else {
                    activateTab(resolved.tab);
                    if (['calculator', 'network', 'guide', 'support'].includes(resolved.tab)) {
                        currentFeatureId.value = resolved.tab;
                    }
                }
            };
            window.navigateTo = navigateTo;

            const handleLoginSuccess = (data) => {
                if (data && data.user) {
                    currentUser.value = data.user;
                } else if (typeof Auth !== 'undefined') {
                    currentUser.value = Auth.getUser();
                }
                fetchNotifications();
                const target = sessionStorage.getItem('redirectAfterLogin') || '/tracking';
                sessionStorage.removeItem('redirectAfterLogin');
                navigateTo(target, true);
            };

            const handleGuestTabClick = (tab, param = null) => {
                if (tab.id === 'support' && param) {
                    currentTrackingCode.value = String(param).trim();
                }
                currentFeatureId.value = tab.id;
                const cleanPath = TAB_ROUTE_MAP[tab.id] || ('/' + tab.id);
                navigateTo(cleanPath);
            };

            const handleBackToHome = () => {
                navigateTo('/tracking');
            };

            const switchTab = (tabId, param = null) => {
                if (tabId === 'support' && param) {
                    currentTrackingCode.value = String(param).trim();
                }
                if (tabId !== 'shipment') {
                    selectedCustomerForShipment.value = null;
                    selectedTariffForShipment.value = null;
                }
                previousTab.value = null;
                const cleanPath = TAB_ROUTE_MAP[tabId] || ('/' + tabId);
                navigateTo(cleanPath);
            };

            const handleViewTracking = (trackingCode, sourceTabId = null) => {
                if (!trackingCode) return;
                const srcId = sourceTabId || currentTab.value;
                const srcObj = allNavigationTabs.find(t => t.id === srcId);
                previousTab.value = srcObj ? { id: srcObj.id, name: srcObj.name } : null;
                currentTrackingCode.value = trackingCode.trim();
                selectedCustomerForShipment.value = null;
                selectedTariffForShipment.value = null;
                activateTab('tracking');
                const newPath = '/tracking?code=' + encodeURIComponent(trackingCode.trim());
                if (window.location.pathname + window.location.search !== newPath) {
                    window.history.pushState({ tab: 'tracking' }, '', newPath);
                }
            };

            const handleBackToPreviousTab = () => {
                if (previousTab.value && previousTab.value.id) {
                    switchTab(previousTab.value.id);
                }
                previousTab.value = null;
            };

            const handleShipmentCreated = (trackingCode) => {
                selectedCustomerForShipment.value = null;
                selectedTariffForShipment.value = null;
                fetchNotifications();
                setTimeout(fetchNotifications, 1500);
                handleViewTracking(trackingCode, 'shipment');
            };

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

            const handleCreateShipmentFromTariff = (tariffData) => {
                selectedTariffForShipment.value = tariffData;
                if (!currentUser.value) {
                    try {
                        sessionStorage.setItem('pendingTariffShipment', JSON.stringify(tariffData));
                        sessionStorage.setItem('redirectAfterLogin', '/shipment');
                    } catch (e) {}
                    if (window.Utils && window.Utils.showToast) {
                        window.Utils.showToast(
                            'Yêu Cầu Đăng Nhập',
                            'Vui lòng đăng nhập để tiếp tục tạo đơn với gói ' + (tariffData?.planName || '') + '. Đang chuyển hướng...',
                            'info'
                        );
                    }
                    setTimeout(() => {
                        navigateTo('/login');
                    }, 500);
                    return;
                }
                switchTab('shipment');
                if (window.Utils && window.Utils.showToast) {
                    window.Utils.showToast('Gói Cước Đã Chọn', 'Đã chuyển sang tạo đơn với gói ' + (tariffData?.planName || ''));
                }
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
                }
                currentUser.value = null;
                if (window.Utils && window.Utils.showToast) {
                    window.Utils.showToast('Đăng Xuất', 'Bạn đã đăng xuất thành công khỏi hệ thống.', 'info');
                }
                navigateTo('/login');
            };

            const handleUserUpdated = (updated) => {
                if (updated && currentUser.value) {
                    currentUser.value = { ...currentUser.value, ...updated };
                    if (typeof Auth !== 'undefined' && Auth.getToken()) {
                        Auth.setSession(Auth.getToken(), currentUser.value);
                    }
                }
            };

            const openUserProfileModal = () => {
                if (typeof Auth === 'undefined' || !Auth.isAuthenticated()) {
                    navigateTo('/login');
                    return;
                }
                switchTab('profile');
            };

            const openUserProfileModalLegacy = async () => {
                showUserProfileModal.value = true;
                isLoadingUserProfile.value = true;
                try {
                    if (isStaffUser.value) {
                        const prof = await Auth.getMyProfile();
                        if (prof) {
                            userProfile.value = prof;
                            syncProfileToCurrentUser(prof);
                            profileFormData.fullName = prof.fullName || currentUser.value?.fullName || '';
                            profileFormData.phoneNumber = prof.phoneNumber || currentUser.value?.phoneNumber || '';
                            profileFormData.address = prof.address || '';
                        }
                    } else {
                        const prof = await CustomerService.getMyProfile();
                        if (prof) {
                            userProfile.value = prof;
                            syncProfileToCurrentUser(prof);
                            profileFormData.fullName = prof.fullName || currentUser.value?.fullName || '';
                            profileFormData.phoneNumber = prof.phoneNumber || '';
                            profileFormData.address = prof.address || '';
                        }
                    }
                } catch (err) {
                    console.warn('[app.js] Không thể tải thông tin hồ sơ:', err);
                    profileFormData.fullName = currentUser.value?.fullName || '';
                    profileFormData.phoneNumber = currentUser.value?.phoneNumber || '';
                } finally {
                    isLoadingUserProfile.value = false;
                }
            };

            const closeUserProfileModal = () => {
                showUserProfileModal.value = false;
            };

            const saveUserProfile = async () => {
                if (!profileFormData.fullName.trim()) {
                    Utils.showToast('Thiếu Thông Tin', isStaffUser.value ? 'Vui lòng nhập Họ và tên cán bộ / nhân viên' : 'Vui lòng nhập Họ tên hoặc Tên cửa hàng', 'warning');
                    return;
                }
                isSavingUserProfile.value = true;
                try {
                    if (isStaffUser.value) {
                        const updated = await Auth.updateMyProfile({
                            fullName: profileFormData.fullName.trim()
                        });
                        const updatedProfile = updated && typeof updated === 'object' ? updated : {
                            fullName: profileFormData.fullName.trim()
                        };
                        userProfile.value = { ...userProfile.value, ...updatedProfile };
                        syncProfileToCurrentUser(updatedProfile, true);

                        Utils.showToast('Thành Công', 'Đã cập nhật hồ sơ cán bộ / nhân viên!');
                        showUserProfileModal.value = false;
                    } else {
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

                        Utils.showToast('Thành Công', 'Đã cập nhật hồ sơ thông tin Shop!');
                        showUserProfileModal.value = false;
                    }
                } catch (err) {
                    Utils.showToast('Lỗi Cập Nhật', err.message || 'Không thể lưu hồ sơ', 'error');
                } finally {
                    isSavingUserProfile.value = false;
                }
            };

            const isLinkingGoogle = ref(false);
            const GOOGLE_CLIENT_ID = "530674460360-7q1qf5lchbkj7sp7kslvttf7mqt92klg.apps.googleusercontent.com";

            const handleGoogleLinkCallback = async (googleResponse) => {
                if (!googleResponse || !googleResponse.credential) {
                    if (window.Utils) Utils.showToast('Lỗi', 'Không nhận được thông tin xác thực từ Google', 'error');
                    return;
                }
                isLinkingGoogle.value = true;
                try {
                    const res = await Api.post('/api/auth/google/link', {
                        idToken: googleResponse.credential
                    });
                    const data = await res.json().catch(() => ({}));
                    if (!res.ok) {
                        throw new Error(data.message || data.error || 'Liên kết tài khoản Google thất bại');
                    }
                    if (typeof Auth !== 'undefined') {
                        const current = Auth.getUser() || {};
                        const nextUser = {
                            ...current,
                            ...data,
                            googleLinked: true,
                            avatarUrl: data.avatarUrl || current.avatarUrl
                        };
                        Auth.setSession(data.accessToken || Auth.getToken(), nextUser);
                        currentUser.value = nextUser;
                    }
                    if (window.Utils) Utils.showToast('Thành Công', 'Đã liên kết tài khoản Google thành công!');
                } catch (err) {
                    if (window.Utils) Utils.showToast('Lỗi Liên Kết', err.message || 'Không thể liên kết Google', 'error');
                } finally {
                    isLinkingGoogle.value = false;
                }
            };

            const triggerGoogleLink = () => {
                if (typeof google === 'undefined' || !google.accounts || !google.accounts.id) {
                    if (window.Utils) Utils.showToast('Thông Báo', 'Thư viện Google đang tải, vui lòng thử lại sau vài giây', 'warning');
                    return;
                }
                try {
                    google.accounts.id.initialize({
                        client_id: GOOGLE_CLIENT_ID,
                        callback: handleGoogleLinkCallback
                    });
                    google.accounts.id.prompt((notification) => {
                        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
                            const container = document.getElementById('googleLinkModalBtn');
                            if (container) {
                                container.classList.remove('hidden');
                                google.accounts.id.renderButton(container, {
                                    theme: 'outline',
                                    size: 'medium',
                                    text: 'continue_with'
                                });
                            }
                        }
                    });
                } catch (e) {
                    console.error('[GoogleLink] Error initializing Google:', e);
                }
            };

            onMounted(() => {
                if (typeof Auth !== 'undefined') {
                    currentUser.value = Auth.getUser();
                }

                if (!currentUser.value) {
                    const currentTabObj = allNavigationTabs.find(t => t.id === currentTab.value);
                    if (currentTabObj && (currentTabObj.permission || currentTabObj.role)) {
                        try {
                            sessionStorage.setItem('redirectAfterLogin', window.location.pathname + window.location.search);
                        } catch (e) {}
                        navigateTo('/login', true);
                    }
                } else if (currentTab.value === 'login') {
                    navigateTo('/tracking', true);
                } else if (currentTab.value !== 'error') {
                    const currentTabObj = allNavigationTabs.find(t => t.id === currentTab.value);
                    if (currentTabObj && currentTabObj.permission && !Auth.hasPermission(currentTabObj.permission)) {
                        navigateTo('/tracking', true);
                    }
                }

                const hash = window.location.hash.replace('#', '').trim();
                if (hash && currentTab.value !== 'error') {
                    navigateTo('/' + hash, true);
                }

                try {
                    const pendingSupportCode = sessionStorage.getItem('supportTrackingCode');
                    if (pendingSupportCode && (currentTab.value === 'support' || hash === 'support')) {
                        currentTrackingCode.value = pendingSupportCode;
                        currentTab.value = 'support';
                        sessionStorage.removeItem('supportTrackingCode');
                    }
                } catch (e) {}

                const pendingTariff = sessionStorage.getItem('pendingTariffShipment');
                if (pendingTariff && currentUser.value) {
                    try {
                        selectedTariffForShipment.value = JSON.parse(pendingTariff);
                        sessionStorage.removeItem('pendingTariffShipment');
                    } catch (e) {}
                }

                const handlePopState = () => {
                    const resolved = resolveRoute(window.location.pathname);
                    const search = new URLSearchParams(window.location.search);
                    const code = search.get('code') || search.get('tracking');
                    if (code) {
                        currentTrackingCode.value = code.trim();
                    }
                    if (resolved.notFound) {
                        showError(404, 'Không Tìm Thấy Trang Yêu Cầu', `Đường dẫn "${window.location.pathname}" không tồn tại trên hệ thống máy chủ bưu chính VNPT.`);
                    } else {
                        activateTab(resolved.tab);
                        if (['calculator', 'network', 'guide', 'support'].includes(resolved.tab)) {
                            currentFeatureId.value = resolved.tab;
                        }
                    }
                };
                window.addEventListener('popstate', handlePopState);

                const handleDocumentClick = (e) => {
                    const dropdownEl = document.getElementById('notification-bell-dropdown');
                    if (dropdownEl && !dropdownEl.contains(e.target)) {
                        showNotificationDropdown.value = false;
                    }
                };
                document.addEventListener('click', handleDocumentClick);

                const handleSystemNotificationEvent = (e) => {
                    const detail = e.detail || {};
                    const visuals = getNotificationVisuals(detail.title, detail.message);
                    const isTrip = isTripNotification(detail);
                    notifications.value.unshift({
                        id: 'local-' + Date.now(),
                        title: detail.title || 'Thông báo hệ thống',
                        message: detail.message || '',
                        trackingCode: detail.trackingCode || null,
                        time: 'Vừa xong',
                        isRead: false,
                        icon: visuals.icon,
                        iconBg: visuals.iconBg,
                        isTrip,
                        trackingLabel: isTrip ? 'Mã chuyến xe:' : 'Mã bưu gửi:'
                    });
                    setTimeout(() => fetchNotifications(), 2000);
                };
                window.addEventListener('system-notification-created', handleSystemNotificationEvent);

                const connectNotificationSocket = () => {
                    if (typeof SockJS === 'undefined' || typeof Stomp === 'undefined') return;
                    if (bellStomp && bellStomp.connected) return;
                    try {
                        const host = window.location.hostname || 'localhost';
                        const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
                        const port = window.location.port;
                        const endpoint = (!port || port === '80' || port === '443')
                            ? `${protocol}//${host}/api/notifications/ws`
                            : `${protocol}//${host}:8080/api/notifications/ws`;
                        const socket = new SockJS(endpoint);
                        bellStomp = Stomp.over(socket);
                        bellStomp.debug = null;
                        bellStomp.connect({}, () => {
                            bellSubscription = bellStomp.subscribe('/topic/notifications/broadcast', () => {
                                fetchNotifications();
                            });
                        }, () => {
                            bellStomp = null;
                        });
                    } catch (err) {
                        console.warn('[Notifications] Không kết nối được chuông thời gian thực:', err);
                    }
                };

                let pollTimer = null;
                let bellStomp = null;
                let bellSubscription = null;
                if (typeof Auth !== 'undefined' && Auth.getToken()) {
                    fetchNotifications();
                    connectNotificationSocket();
                    pollTimer = setInterval(() => {
                        if (Auth.getToken()) {
                            fetchNotifications();
                        }
                    }, 30000);
                }

                const handleNavigateToTracking = (e) => {
                    if (e.detail && e.detail.trackingCode) {
                        handleViewTracking(e.detail.trackingCode);
                    }
                };
                window.addEventListener('navigate-to-tracking', handleNavigateToTracking);

                const handleNavigateToSupport = (e) => {
                    const code = e.detail && e.detail.trackingCode ? e.detail.trackingCode : null;
                    switchTab('support', code);
                };
                window.addEventListener('navigate-to-support', handleNavigateToSupport);

                onUnmounted(() => {
                    window.removeEventListener('popstate', handlePopState);
                    document.removeEventListener('click', handleDocumentClick);
                    window.removeEventListener('system-notification-created', handleSystemNotificationEvent);
                    window.removeEventListener('navigate-to-tracking', handleNavigateToTracking);
                    window.removeEventListener('navigate-to-support', handleNavigateToSupport);
                    if (pollTimer) clearInterval(pollTimer);
                    if (bellSubscription) {
                        try { bellSubscription.unsubscribe(); } catch (e) {}
                    }
                    if (bellStomp && bellStomp.connected) {
                        try { bellStomp.disconnect(); } catch (e) {}
                    }
                });
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
                showPublicMobileMenu,
                handleGuestTabClick,
                activeComponent,
                currentTrackingCode,
                selectedCustomerForShipment,
                selectedTariffForShipment,
                switchTab,
                navigateTo,
                handleLoginSuccess,
                handleViewTracking,
                handleBackToPreviousTab,
                handleShipmentCreated,
                handleCreateShipmentFor,
                handleCreateShipmentFromTariff,
                handleLogoClick,
                handleLogout,
                currentFeatureId,
                handleBackToHome,
                showNotificationDropdown,
                notifications,
                unreadNotificationsCount,
                toggleNotificationDropdown,
                closeNotificationDropdown,
                markAllNotificationsAsRead,
                handleNotificationClick,
                showNotificationDetailModal,
                activeNotificationDetail,
                openNotificationDetailModal,
                closeNotificationDetailModal,
                handleNavigateToTripFromModal,
                handleNavigateToTrackingFromModal,
                currentErrorCode,
                currentErrorTitle,
                currentErrorMessage,
                showError,
                showUserProfileModal,
                userProfile,
                isLoadingUserProfile,
                isSavingUserProfile,
                profileFormData,
                isStaffUser,
                getRoleTitle,
                openUserProfileModal,
                closeUserProfileModal,
                saveUserProfile,
                isLinkingGoogle,
                triggerGoogleLink,
                handleUserUpdated,
                isDarkMode,
                toggleDarkMode,
                toast: window.Utils ? window.Utils.toastState : { show: false },
                getRoleBadgeInfo: window.Utils ? window.Utils.getRoleBadgeInfo : () => ({ label: 'NHÂN VIÊN', class: 'bg-slate-50' })
            };
        }
    });

    if (window.AppSidebar) {
        app.component('AppSidebar', window.AppSidebar);
        app.component('app-sidebar', window.AppSidebar);
    }
    if (window.AppTopbar) {
        app.component('AppTopbar', window.AppTopbar);
        app.component('app-topbar', window.AppTopbar);
    }
    if (window.InternalFooter) {
        app.component('InternalFooter', window.InternalFooter);
        app.component('internal-footer', window.InternalFooter);
    }
    if (window.PublicHeader) {
        app.component('PublicHeader', window.PublicHeader);
        app.component('public-header', window.PublicHeader);
    }
    if (window.PublicFooter) {
        app.component('PublicFooter', window.PublicFooter);
        app.component('public-footer', window.PublicFooter);
    }
    if (window.ToastContainer) {
        app.component('ToastContainer', window.ToastContainer);
        app.component('toast-container', window.ToastContainer);
    }
    if (window.UserProfileModal) {
        app.component('UserProfileModal', window.UserProfileModal);
        app.component('user-profile-modal', window.UserProfileModal);
    }
    if (window.InternalLayout) {
        app.component('InternalLayout', window.InternalLayout);
        app.component('internal-layout', window.InternalLayout);
    }
    if (window.PublicLayout) {
        app.component('PublicLayout', window.PublicLayout);
        app.component('public-layout', window.PublicLayout);
    }

    if (window.LoginView) {
        app.component('LoginView', window.LoginView);
        app.component('login-view', window.LoginView);
    }
    if (window.TrackingView) app.component('TrackingView', window.TrackingView);
    if (window.ShipmentView) app.component('ShipmentView', window.ShipmentView);
    if (window.PostOfficeOpsView) app.component('PostOfficeOpsView', window.PostOfficeOpsView);
    if (window.HubOpsView) app.component('HubOpsView', window.HubOpsView);
    if (window.TripsView) app.component('TripsView', window.TripsView);
    if (window.ShipperView) app.component('ShipperView', window.ShipperView);
    if (window.ShipperDirectoryView) app.component('ShipperDirectoryView', window.ShipperDirectoryView);
    if (window.CustomerView) app.component('CustomerView', window.CustomerView);
    if (window.AdminRbacView) app.component('AdminRbacView', window.AdminRbacView);
    if (window.ReportView) app.component('ReportView', window.ReportView);
    if (window.TariffCalculatorView) app.component('TariffCalculatorView', window.TariffCalculatorView);
    if (window.NetworkView) app.component('NetworkView', window.NetworkView);
    if (window.GuideView) app.component('GuideView', window.GuideView);
    if (window.SupportView) app.component('SupportView', window.SupportView);
    if (window.UnderDevelopmentView) app.component('UnderDevelopmentView', window.UnderDevelopmentView);
    if (window.ErrorView) app.component('ErrorView', window.ErrorView);
    if (window.ProfileView) app.component('ProfileView', window.ProfileView);
    if (window.ChatbotWidget) {
        app.component('ChatbotWidget', window.ChatbotWidget);
        app.component('chatbot-widget', window.ChatbotWidget);
    }

    app.config.errorHandler = (err, vm, info) => {
        console.error('VUE_APP_ERROR:', err, err ? err.stack : '', info);
    };

    app.mount('#app');
})();
