import { createViewLoader } from './viewLoader.js?v=3.8.0';
import './auth.js';
import './utils.js?v=3.9.1';
import './api.js';
import './map.js';
import './services/routingService.js';
import './services/shipmentService.js';
import './services/trackingService.js';
import './services/customerService.js';
import './services/notificationService.js';
import './services/auditService.js';
import './services/adminService.js';
import './services/reportService.js';
import './services/pricingService.js';
import './services/supportService.js';
import './services/supportChatRuntime.js?v=3.8.1';
import './services/shipperService.js';
import './services/ratingService.js';
import './services/paymentService.js?v=3.6.6';
import './components/layout/AppSidebar.js?v=3.8.2';
import './components/layout/AppTopbar.js?v=3.7.6';
import './components/layout/AppBottomNav.js?v=3.8.2';
import './components/layout/InternalFooter.js';
import './components/layout/PublicHeader.js?v=3.8.3';
import './components/layout/PublicFooter.js';
import './components/common/ToastContainer.js';
import './components/common/UserProfileModal.js?v=3.7.1';
import './components/common/ShipmentDetailModal.js';
import './layouts/InternalLayout.js';
import './layouts/PublicLayout.js?v=3.8.3';
import './components/ChatbotWidget.js?v=3.8.3';
import { authStore, appStore, notificationStore, badgeStore } from './store/index.js?v=3.8.2';
window.authStore = authStore;
window.appStore = appStore;
window.notificationStore = notificationStore;
window.badgeStore = badgeStore;
const { createApp, ref, reactive, computed, onMounted, onUnmounted, nextTick } = Vue;
    const ROUTE_TAB_MAP = {
        '/': 'tracking',
        '/index.html': 'tracking',
        '/tracking': 'tracking',
        '/dashboard': 'dashboard',
        '/shipment': 'shipment',
        '/trips': 'trips',
        '/fleet': 'fleet',
        '/post-office': 'post-office',
        '/hub-ops': 'hub-ops',
        '/shipper': 'shipper',
        '/shipper-directory': 'shipper-directory',
        '/customer': 'customers',
        '/customers': 'customers',
        '/report': 'reports',
        '/reports': 'reports',
        '/payments': 'payments',
        '/payment': 'payments',
        '/tariff': 'calculator',
        '/calculator': 'calculator',
        '/network': 'network',
        '/guide': 'guide',
        '/support': 'support',
        '/ratings': 'ratings',
        '/admin-ratings': 'ratings',
        '/admin-rbac': 'rbac',
        '/rbac': 'rbac',
        '/profile': 'profile',
        '/login': 'login',
        '/login.html': 'login',
        '/error': 'error',
        '/error.html': 'error'
    };
    const TAB_ROUTE_MAP = {
        'dashboard': '/dashboard',
        'tracking': '/tracking',
        'shipment': '/shipment',
        'trips': '/trips',
        'fleet': '/fleet',
        'post-office': '/post-office',
        'hub-ops': '/hub-ops',
        'shipper': '/shipper',
        'shipper-directory': '/shipper-directory',
        'customers': '/customer',
        'reports': '/report',
        'payments': '/payments',
        'calculator': '/calculator',
        'network': '/network',
        'guide': '/guide',
        'support': '/support',
        'ratings': '/ratings',
        'rbac': '/admin-rbac',
        'profile': '/profile',
        'login': '/login',
        'error': '/error'
    };
    const resolveRoute = (inputPath) => {
        const hasWindow = typeof window !== 'undefined' && window.location;
        let clean = inputPath || (hasWindow ? window.location.pathname : '/');
        if (hasWindow && window.location.hash && (!inputPath || inputPath === window.location.pathname)) {
            let hash = window.location.hash.replace('#', '').trim();
            if (hash) {
                while (hash.startsWith('/')) hash = hash.slice(1);
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
        
        const trackingSubMatch = pathname.match(/^\/(?:tracking|tra-cuu)\/([^/?#]+)$/i);
        if (trackingSubMatch) {
            const code = decodeURIComponent(trackingSubMatch[1]).trim();
            if (code) {
                return { tab: 'tracking', path: '/tracking', code: code.toUpperCase(), notFound: false };
            }
        }
        
        const directCodeMatch = pathname.match(/^\/((?:wb[0-9a-z_-]*|vnpt[0-9a-z_-]*|[0-9]{4,30}))$/i);
        if (directCodeMatch) {
            const potentialCode = directCodeMatch[1].trim();
            if (!potentialCode.includes('.') && !['api', 'css', 'js', 'libs', 'images', 'assets', 'favicon', 'fonts'].includes(potentialCode.toLowerCase())) {
                return { tab: 'tracking', path: '/tracking', code: potentialCode.toUpperCase(), notFound: false };
            }
        }
        return { tab: 'error', path: pathname, notFound: true };
    };
    const ALL_NAVIGATION_TABS = [
        { 
            id: 'dashboard', 
            name: 'Bảng Điều Hành', 
            component: 'DashboardView', 
            staffOnly: true,
            icon: 'M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10-5a1 1 0 011-1h4a1 1 0 011 1v9a1 1 0 01-1 1h-4a1 1 0 01-1-1v-9z'
        },
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
            id: 'fleet', 
            name: 'Quản Lý Đội Xe', 
            component: 'FleetView', 
            permission: 'routing:trip_manage',
            icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10'
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
            name: 'Ca Trực & Bưu Tá',
            component: 'ShipperDirectoryView',
            permission: 'user:assign_role',
            icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'
        },
        { 
            id: 'reports', 
            name: 'Báo Cáo & Đối Soát', 
            component: 'ReportView', 
            permission: null,
            requiresAuth: true,
            icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'
        },
        { 
            id: 'payments', 
            name: 'Quản Lý Thanh Toán', 
            component: 'PaymentView', 
            permission: null,
            requiresAuth: true,
            icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
        },
        { 
            id: 'ratings', 
            name: 'Quản Lý Đánh Giá', 
            component: 'AdminRatingView', 
            roles: ['ROLE_ADMIN', 'ADMIN', 'ROLE_DISPATCHER', 'DISPATCHER'],
            icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z'
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
            requiresAuth: true,
            icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'
        }
    ];
    const PUBLIC_GUEST_TABS = [
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
    const isTabAuthRequired = (tab) => {
        if (!tab) return false;
        if (tab.id === 'tracking' || tab.id === 'support') return false;
        return Boolean(tab.requiresAuth || tab.permission || tab.role || tab.roles || tab.staffOnly);
    };
    const app = createApp({
        setup() {
            const urlParams = new URLSearchParams(window.location.search);
            const initialRoute = resolveRoute(window.location.pathname);
            
            const rawErrorCodeParam = parseInt(urlParams.get('code'), 10);
            const isHttpErrorCode = !isNaN(rawErrorCodeParam) && [400, 401, 403, 404, 429, 500, 502, 503].includes(rawErrorCodeParam);
            const isExplicitErrorRoute = initialRoute.tab === 'error' && (window.location.pathname.startsWith('/error') || initialRoute.notFound);
            const hasInitialError = isExplicitErrorRoute || (isHttpErrorCode && initialRoute.tab === 'error');
            const trackingQuery = initialRoute.code || urlParams.get('code') || urlParams.get('tracking');
            const isAuthUser = () => {
                if (typeof Auth !== 'undefined' && typeof Auth.isAuthenticated === 'function') {
                    return Auth.isAuthenticated();
                }
                return Boolean(currentUser.value);
            };
            const initialUser = (typeof Auth !== 'undefined' && typeof Auth.isAuthenticated === 'function')
                ? (Auth.isAuthenticated() ? Auth.getUser() : null)
                : (typeof Auth !== 'undefined' ? Auth.getUser() : null);
            const currentUser = ref(initialUser);
            
            const authVersion = ref(0);
            if (typeof window !== 'undefined') {
                window.addEventListener('auth:changed', () => {
                    const authenticated = typeof Auth !== 'undefined' && typeof Auth.isAuthenticated === 'function'
                        ? Auth.isAuthenticated()
                        : false;
                    currentUser.value = authenticated ? Auth.getUser() : null;
                    authVersion.value += 1;
                });
            }
            const initialTabObj = ALL_NAVIGATION_TABS.find(t => t.id === initialRoute.tab);
            const isInitialAuthRequired = isTabAuthRequired(initialTabObj);
            const shouldRedirectToLogin = !isAuthUser() && isInitialAuthRequired;
            if (shouldRedirectToLogin) {
                try {
                    sessionStorage.setItem('redirectAfterLogin', window.location.pathname + window.location.search);
                } catch (e) {}
                if (typeof window !== 'undefined' && window.history && window.history.replaceState) {
                    window.history.replaceState({ tab: 'login' }, '', '/login');
                }
            }
            const currentTab = ref(hasInitialError ? 'error' : (shouldRedirectToLogin ? 'login' : initialRoute.tab));
            const currentTrackingCode = ref(trackingQuery && !hasInitialError && initialRoute.tab !== 'error' ? trackingQuery.trim() : '');
            const currentErrorCode = ref(isHttpErrorCode ? rawErrorCodeParam : (initialRoute.notFound ? 404 : 200));
            const currentErrorTitle = ref(urlParams.get('title') || (initialRoute.notFound ? 'Không Tìm Thấy Trang Yêu Cầu' : ''));
            const currentErrorMessage = ref(urlParams.get('message') || (initialRoute.notFound ? `Đường dẫn "${window.location.pathname}" không tồn tại trên hệ thống máy chủ bưu chính Waybill.` : ''));
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
            const isDarkMode = ref(
                (typeof document !== 'undefined' && (
                    document.documentElement.classList.contains('dark') ||
                    (localStorage.getItem('waybill_theme') || localStorage.getItem('theme')) === 'dark'
                )) ||
                (window.appStore && window.appStore.isDarkMode === true) ||
                false
            );
            const onThemeChanged = (e) => {
                if (e && e.detail && typeof e.detail.isDark === 'boolean') {
                    isDarkMode.value = e.detail.isDark;
                } else if (typeof document !== 'undefined') {
                    isDarkMode.value = document.documentElement.classList.contains('dark');
                }
            };
            if (typeof window !== 'undefined') {
                window.addEventListener('theme-changed', onThemeChanged);
            }
            const toggleDarkMode = (targetMode, origin) => {
                const nextMode = typeof targetMode === 'boolean' ? targetMode : !isDarkMode.value;
                isDarkMode.value = nextMode;
                if (appStore?.setDarkMode) {
                    appStore.setDarkMode(nextMode, origin);
                    return;
                } else if (typeof document !== 'undefined') {
                    if (nextMode) {
                        document.documentElement.classList.add('dark');
                        localStorage.setItem('waybill_theme', 'dark');
                        localStorage.removeItem('theme');
                    } else {
                        document.documentElement.classList.remove('dark');
                        localStorage.setItem('waybill_theme', 'light');
                        localStorage.removeItem('theme');
                    }
                }
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('theme-changed', {
                        detail: { isDark: nextMode }
                    }));
                }
            };
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
                const token = window.Auth?.getToken();
                if (!token) {
                    notifications.value = notifications.value.filter(item => item.isChat);
                    return;
                }
                if (typeof NotificationService === 'undefined' || !NotificationService.getMyNotifications) return;
                try {
                    const list = await NotificationService.getMyNotifications();
                    if (Array.isArray(list)) {
                        notifications.value = [...notifications.value.filter(item => item.isChat), ...list.map(item => {
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
                        })];
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
                const latestByTicket = new Map();
                for (const item of notifications.value.filter(item => item.isChat)) {
                    if (!latestByTicket.has(item.ticketId) || item.messageId > latestByTicket.get(item.ticketId).id) {
                        latestByTicket.set(item.ticketId, { ticketId: item.ticketId, id: item.messageId });
                    }
                }
                const results = await Promise.allSettled([...latestByTicket.values()].map(item => window.SupportChatRuntime.dismiss(item)));
                notifications.value.forEach(item => {
                    if (!item.isChat) item.isRead = true;
                });
                if (window.Auth?.getToken() && typeof NotificationService !== 'undefined' && NotificationService.markAllAsRead) {
                    NotificationService.markAllAsRead();
                }
                if (results.some(result => result.status === 'rejected')) {
                    window.Utils?.showToast('Chưa đồng bộ', 'Một số thông báo chưa được đánh dấu đã xem. Vui lòng thử lại.', 'warning');
                    return;
                }
                if (window.Utils && window.Utils.showToast) {
                    window.Utils.showToast('Thông Báo', 'Đã đánh dấu tất cả thông báo là đã đọc!', 'success');
                }
            };
            const handleNotificationClick = async (item) => {
                if (item.isChat) {
                    window.SupportChatRuntime.dismiss({ ticketId: item.ticketId, id: item.messageId }).catch(() => {});
                    showNotificationDropdown.value = false;
                    window.SupportChatRuntime.open(item.ticketCode);
                    return;
                }
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
            const showShipmentDetailModal = ref(false);
            const selectedTrackingCodeForModal = ref('');
            const userProfile = ref(null);
            const isLoadingUserProfile = ref(false);
            const isSavingUserProfile = ref(false);
            const profileFormData = reactive({
                fullName: '',
                phoneNumber: '',
                address: ''
            });
            const stationFieldNames = ['locationCode', 'postOfficeCode', 'hubCode'];
            
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
                if (typeof document !== 'undefined') {
                    setTimeout(() => {
                        const mainEl = document.querySelector('main');
                        if (mainEl) mainEl.scrollTop = 0;
                    }, 50);
                }
            };
            const toggleSidebarCollapse = () => {
                isSidebarCollapsed.value = !isSidebarCollapsed.value;
                setTimeout(() => {
                    if (window.MapManager) {
                        window.MapManager.invalidateSize();
                    }
                }, 300);
            };
            const allNavigationTabs = ALL_NAVIGATION_TABS;
            const publicGuestTabs = PUBLIC_GUEST_TABS;
            const showPublicMobileMenu = ref(false);
            const navigationTabs = computed(() => {
                void authVersion.value;
                void currentUser.value;
                const authenticated = (typeof Auth !== 'undefined' && typeof Auth.isAuthenticated === 'function')
                    ? Auth.isAuthenticated()
                    : Boolean(currentUser.value);
                return allNavigationTabs.filter(tab => {
                    if (isTabAuthRequired(tab) && !authenticated) return false;
                    if (tab.staffOnly) {
                        if (typeof Auth === 'undefined' || !Auth.isInternalStaff()) return false;
                    }
                    if (tab.roles) {
                        if (typeof Auth === 'undefined') return false;
                        return Auth.hasAnyRole(tab.roles);
                    }
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
                    const errorNames = {
                        400: 'Yêu Cầu Không Hợp Lệ (400)',
                        401: 'Chưa Xác Thực (401)',
                        403: 'Truy Cập Bị Chặn (403)',
                        404: 'Không Tìm Thấy Trang (404)',
                        429: 'Giới Hạn Tần Suất (429)',
                        500: 'Lỗi Máy Chủ Nội Bộ (500)',
                        502: 'Mất Kết Nối Gateway (502)',
                        503: 'Dịch Vụ Tạm Ngưng (503)'
                    };
                    return currentErrorTitle.value || errorNames[currentErrorCode.value] || `Mã Trạng Thái ${currentErrorCode.value}`;
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
                const isAuthRequired = isTabAuthRequired(targetTab);
                const authenticated = (typeof Auth !== 'undefined' && typeof Auth.isAuthenticated === 'function')
                    ? Auth.isAuthenticated()
                    : Boolean(currentUser.value);
                if (!authenticated && isAuthRequired) {
                    try {
                        sessionStorage.setItem('redirectAfterLogin', urlObj.pathname + urlObj.search);
                    } catch (e) {}
                    if (window.Utils && window.Utils.showToast) {
                        window.Utils.showToast(
                            'Yêu Cầu Đăng Nhập',
                            'Vui lòng đăng nhập để truy cập tính năng ' + (targetTab ? targetTab.name : 'này') + '. Đang chuyển hướng...',
                            'info'
                        );
                    }
                    setTimeout(() => {
                        navigateTo('/login');
                    }, 300);
                    return;
                }
                if (resolved.tab === 'login' && authenticated) {
                    navigateTo('/tracking', true);
                    return;
                }
                if (targetTab && targetTab.staffOnly) {
                    if (typeof Auth === 'undefined' || !Auth.isInternalStaff()) {
                        showError(403, 'Quyền Truy Cập Bị Chặn (403)', 'Chức năng này chỉ dành riêng cho cán bộ nhân viên vận hành nội bộ!');
                        return;
                    }
                }
                if (targetTab && targetTab.roles) {
                    if (typeof Auth === 'undefined' || !Auth.hasAnyRole(targetTab.roles)) {
                        showError(403, 'Quyền Truy Cập Bị Chặn (403)', 'Chức năng này chỉ dành riêng cho Quản trị viên hoặc Điều phối viên!');
                        return;
                    }
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
                if (resolved.tab !== 'error') {
                    const code = params.get('code') || params.get('tracking') || resolved.code;
                    if (code) {
                        currentTrackingCode.value = code.trim();
                    }
                } else {
                    currentTrackingCode.value = '';
                }
                const canonicalPath = TAB_ROUTE_MAP[resolved.tab] || urlObj.pathname;
                let finalUrl = canonicalPath + (urlObj.search || '');
                if (resolved.tab === 'tracking' && !params.get('code') && (params.get('tracking') || resolved.code)) {
                    const code = params.get('tracking') || resolved.code;
                    finalUrl = '/tracking?code=' + encodeURIComponent(code.trim());
                }
                if (window.location.pathname + window.location.search !== finalUrl) {
                    if (replace) {
                        window.history.replaceState({ tab: resolved.tab }, '', finalUrl);
                    } else {
                        window.history.pushState({ tab: resolved.tab }, '', finalUrl);
                    }
                }
                if (resolved.tab === 'error' || resolved.notFound) {
                    const rawCodeParam = parseInt(params.get('code'), 10);
                    const validHttpCode = !isNaN(rawCodeParam) && [400, 401, 403, 404, 429, 500, 502, 503].includes(rawCodeParam);
                    const errorCode = validHttpCode ? rawCodeParam : (resolved.notFound ? 404 : 200);
                    const errorTitle = params.get('title') || (resolved.notFound ? 'Không Tìm Thấy Trang Yêu Cầu' : '');
                    const errorMessage = params.get('message') || (resolved.notFound ? `Đường dẫn "${urlObj.pathname}" không tồn tại trên hệ thống máy chủ bưu chính Waybill.` : '');
                    showError(errorCode, errorTitle, errorMessage);
                } else {
                    activateTab(resolved.tab);
                    if (['calculator', 'network', 'guide', 'support'].includes(resolved.tab)) {
                        currentFeatureId.value = resolved.tab;
                    }
                }
            };
            window.navigateTo = navigateTo;
            window.ALL_NAVIGATION_TABS = ALL_NAVIGATION_TABS;
            window.isTabAuthRequired = isTabAuthRequired;
            window.resolveRoute = resolveRoute;
            const handleLoginSuccess = (data) => {
                const releasePreloader = window.WaybillPreloader?.show();
                if (data && data.user) {
                    currentUser.value = data.user;
                } else if (typeof Auth !== 'undefined') {
                    currentUser.value = Auth.getUser();
                }
                fetchNotifications();
                if (typeof badgeStore !== 'undefined' && badgeStore.startPolling) {
                    badgeStore.startPolling(currentUser.value);
                }
                const defaultTarget = (typeof Auth !== 'undefined' && Auth.isInternalStaff()) ? '/dashboard' : '/tracking';
                const target = sessionStorage.getItem('redirectAfterLogin') || defaultTarget;
                sessionStorage.removeItem('redirectAfterLogin');
                navigateTo(target, true);
                const destination = activeComponent.value;
                const destinationLoader = viewLoaders[destination];
                Promise.resolve(destinationLoader ? destinationLoader() : undefined)
                    .then(() => nextTick(() => releasePreloader?.()), error => {
                        console.error('LOGIN_VIEW_LOAD_ERROR:', error);
                        releasePreloader?.();
                    });
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
            const openShipmentDetailModal = (trackingCode) => {
                if (!trackingCode) return;
                selectedTrackingCodeForModal.value = trackingCode.trim();
                showShipmentDetailModal.value = true;
            };
            window.openShipmentDetailModal = openShipmentDetailModal;
            const closeShipmentDetailModal = () => {
                showShipmentDetailModal.value = false;
            };
            const openFullTrackingFromModal = (trackingCode) => {
                closeShipmentDetailModal();
                if (!trackingCode) return;
                const code = trackingCode.trim();
                currentTrackingCode.value = code;
                selectedCustomerForShipment.value = null;
                selectedTariffForShipment.value = null;
                activateTab('tracking');
                const newPath = '/tracking?code=' + encodeURIComponent(code);
                if (window.location.pathname + window.location.search !== newPath) {
                    window.history.pushState({ tab: 'tracking' }, '', newPath);
                }
            };
            const handleViewTracking = (trackingCode, sourceTabId = null) => {
                if (!trackingCode) return;
                const code = trackingCode.trim();
                
                if (currentTab.value === 'tracking') {
                    const srcId = sourceTabId || currentTab.value;
                    const srcObj = allNavigationTabs.find(t => t.id === srcId);
                    previousTab.value = srcObj ? { id: srcObj.id, name: srcObj.name } : null;
                    currentTrackingCode.value = code;
                    selectedCustomerForShipment.value = null;
                    selectedTariffForShipment.value = null;
                    const newPath = '/tracking?code=' + encodeURIComponent(code);
                    if (window.location.pathname + window.location.search !== newPath) {
                        window.history.pushState({ tab: 'tracking' }, '', newPath);
                    }
                    return;
                }
                
                openShipmentDetailModal(code);
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
                openShipmentDetailModal(trackingCode);
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
                if (typeof badgeStore !== 'undefined') {
                    badgeStore.stopPolling();
                    badgeStore.refreshBadges(null);
                }
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
                    window.initGoogleIdentity(GOOGLE_CLIENT_ID, handleGoogleLinkCallback);
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
                const handleChatNotifications = event => {
                    const chatItems = (event.detail || []).map(item => ({
                        id: `chat-${item.id}`, messageId: item.id, ticketId: item.ticketId, ticketCode: item.ticketCode,
                        title: `Tin nhắn hỗ trợ · ${item.ticketCode}`, message: `${item.senderName || 'Đối phương'}: ${item.content || '[Tệp đính kèm]'}`,
                        time: formatNotificationTime(item.createdAt), isRead: !!item.isRead, isChat: true,
                        icon: getNotificationVisuals('Tin nhắn', '').icon, iconBg: 'bg-blue-100 text-blue-700',
                        trackingCode: item.ticketCode, trackingLabel: 'Phiếu hỗ trợ:'
                    }));
                    notifications.value = [...chatItems, ...notifications.value.filter(item => !item.isChat)];
                };
                window.addEventListener('support:notifications', handleChatNotifications);
                window.SupportChatRuntime.start();
                if (typeof Auth !== 'undefined') {
                    currentUser.value = Auth.isAuthenticated() ? Auth.getUser() : null;
                }
                if (typeof badgeStore !== 'undefined' && badgeStore.startPolling) {
                    badgeStore.startPolling(currentUser.value);
                }
                const authenticated = (typeof Auth !== 'undefined' && typeof Auth.isAuthenticated === 'function')
                    ? Auth.isAuthenticated()
                    : Boolean(currentUser.value);
                const currentTabObj = allNavigationTabs.find(t => t.id === currentTab.value);
                const isAuthRequired = isTabAuthRequired(currentTabObj);
                if (!authenticated) {
                    if (isAuthRequired) {
                        try {
                            sessionStorage.setItem('redirectAfterLogin', window.location.pathname + window.location.search);
                        } catch (e) {}
                        navigateTo('/login', true);
                        return;
                    }
                } else if (currentTab.value === 'login') {
                    navigateTo('/tracking', true);
                    return;
                } else if (currentTab.value !== 'error' && currentTabObj) {
                    if (currentTabObj.staffOnly && !Auth.isInternalStaff()) {
                        showError(403, 'Quyền Truy Cập Bị Chặn (403)', 'Chức năng này chỉ dành riêng cho cán bộ nhân viên vận hành nội bộ!');
                        return;
                    } else if (currentTabObj.roles && !Auth.hasAnyRole(currentTabObj.roles)) {
                        showError(403, 'Quyền Truy Cập Bị Chặn (403)', 'Chức năng này chỉ dành riêng cho Quản trị viên hoặc Điều phối viên!');
                        return;
                    } else if (currentTabObj.role && !Auth.hasRole(currentTabObj.role)) {
                        showError(403, 'Quyền Truy Cập Bị Chặn (403)', 'Chức năng này chỉ dành riêng cho Quản trị viên hệ thống!');
                        return;
                    } else if (currentTabObj.permission && !Auth.hasPermission(currentTabObj.permission)) {
                        showError(403, 'Truy Cập Bị Chặn (403)', 'Tài khoản của bạn không có quyền truy cập tab này!');
                        return;
                    }
                }
                let hash = window.location.hash.replace('#', '').trim();
                if (hash && currentTab.value !== 'error') {
                    while (hash.startsWith('/')) hash = hash.slice(1);
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
                    const targetTab = allNavigationTabs.find(t => t.id === resolved.tab);
                    const isAuthRequired = isTabAuthRequired(targetTab);
                    const authenticated = (typeof Auth !== 'undefined' && typeof Auth.isAuthenticated === 'function')
                        ? Auth.isAuthenticated()
                        : Boolean(currentUser.value);
                    if (!authenticated && isAuthRequired) {
                        try {
                            sessionStorage.setItem('redirectAfterLogin', window.location.pathname + window.location.search);
                        } catch (e) {}
                        navigateTo('/login', true);
                        return;
                    }
                    if (resolved.tab === 'login' && authenticated) {
                        navigateTo('/tracking', true);
                        return;
                    }
                    if (targetTab && targetTab.staffOnly && (typeof Auth === 'undefined' || !Auth.isInternalStaff())) {
                        showError(403, 'Quyền Truy Cập Bị Chặn (403)', 'Chức năng này chỉ dành riêng cho cán bộ nhân viên vận hành nội bộ!');
                        return;
                    }
                    if (targetTab && targetTab.roles && (typeof Auth === 'undefined' || !Auth.hasAnyRole(targetTab.roles))) {
                        showError(403, 'Quyền Truy Cập Bị Chặn (403)', 'Chức năng này chỉ dành riêng cho Quản trị viên hoặc Điều phối viên!');
                        return;
                    }
                    if (targetTab && targetTab.role && (typeof Auth === 'undefined' || !Auth.hasRole(targetTab.role))) {
                        showError(403, 'Quyền Truy Cập Bị Chặn (403)', 'Chức năng này chỉ dành riêng cho Quản trị viên hệ thống!');
                        return;
                    }
                    if (targetTab && targetTab.permission && (typeof Auth === 'undefined' || !Auth.hasPermission(targetTab.permission))) {
                        showError(403, 'Truy Cập Bị Chặn (403)', 'Tài khoản của bạn không có quyền truy cập tab này!');
                        return;
                    }
                    const search = new URLSearchParams(window.location.search);
                    if (resolved.tab !== 'error') {
                        const code = search.get('code') || search.get('tracking');
                        if (code) {
                            currentTrackingCode.value = code.trim();
                        }
                    } else {
                        currentTrackingCode.value = '';
                    }
                    if (resolved.tab === 'error' || resolved.notFound) {
                        const rawCodeParam = parseInt(search.get('code'), 10);
                        const validHttpCode = !isNaN(rawCodeParam) && [400, 401, 403, 404, 429, 500, 502, 503].includes(rawCodeParam);
                        const errorCode = validHttpCode ? rawCodeParam : (resolved.notFound ? 404 : 200);
                        const errorTitle = search.get('title') || (resolved.notFound ? 'Không Tìm Thấy Trang Yêu Cầu' : '');
                        const errorMessage = search.get('message') || (resolved.notFound ? `Đường dẫn "${window.location.pathname}" không tồn tại trên hệ thống máy chủ bưu chính Waybill.` : '');
                        showError(errorCode, errorTitle, errorMessage);
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
                        bellStomp.connect((typeof Auth !== 'undefined' && Auth.getToken()) ? { Authorization: `Bearer ${Auth.getToken()}` } : {}, () => {
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
                    if (e.detail?.ticketCode) {
                        switchTab('support');
                        return;
                    }
                    const code = e.detail && e.detail.trackingCode ? e.detail.trackingCode : null;
                    switchTab('support', code);
                };
                window.addEventListener('navigate-to-support', handleNavigateToSupport);
                onUnmounted(() => {
                    window.removeEventListener('support:notifications', handleChatNotifications);
                    window.SupportChatRuntime.stop();
                    window.removeEventListener('popstate', handlePopState);
                    document.removeEventListener('click', handleDocumentClick);
                    window.removeEventListener('system-notification-created', handleSystemNotificationEvent);
                    window.removeEventListener('navigate-to-tracking', handleNavigateToTracking);
                    window.removeEventListener('navigate-to-support', handleNavigateToSupport);
                    if (typeof badgeStore !== 'undefined' && badgeStore.stopPolling) {
                        badgeStore.stopPolling();
                    }
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
                showShipmentDetailModal,
                selectedTrackingCodeForModal,
                openShipmentDetailModal,
                closeShipmentDetailModal,
                openFullTrackingFromModal,
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
    if (window.AppBottomNav) {
        app.component('AppBottomNav', window.AppBottomNav);
        app.component('app-bottom-nav', window.AppBottomNav);
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
    if (window.ShipmentDetailModal) {
        app.component('ShipmentDetailModal', window.ShipmentDetailModal);
        app.component('shipment-detail-modal', window.ShipmentDetailModal);
    }
    if (window.InternalLayout) {
        app.component('InternalLayout', window.InternalLayout);
        app.component('internal-layout', window.InternalLayout);
    }
    if (window.PublicLayout) {
        app.component('PublicLayout', window.PublicLayout);
        app.component('public-layout', window.PublicLayout);
    }
    const viewLoaders = {
        LoginView: createViewLoader('LoginView', () => import('./views/LoginView.js?v=3.9.1'), []),
        TrackingView: createViewLoader('TrackingView', () => import('./views/TrackingView.js?v=3.9.1'), [() => import('./views/tracking/TrackingRecentSearches.js?v=3.9.1')]),
        ShipmentView: createViewLoader('ShipmentView', () => import('./views/ShipmentView.js?v=3.9.1'), [() => import('./views/shipment/ShipmentSmartPasteCard.js?v=3.9.1'), () => import('./views/shipment/ShipmentPrintModal.js?v=3.9.1')]),
        DashboardView: createViewLoader('DashboardView', () => import('./views/DashboardView.js?v=3.9.1'), []),
        PostOfficeOpsView: createViewLoader('PostOfficeOpsView', () => import('./views/PostOfficeOpsView.js?v=3.9.1'), []),
        TripsView: createViewLoader('TripsView', () => import('./views/TripsView.js?v=3.9.1'), [() => import('./views/trips/TripManifestModal.js?v=3.9.1')]),
        FleetView: createViewLoader('FleetView', () => import('./views/FleetView.js?v=3.9.1'), []),
        HubOpsView: createViewLoader('HubOpsView', () => import('./views/HubOpsView.js?v=3.9.1'), []),
        ShipperView: createViewLoader('ShipperView', () => import('./views/ShipperView.js?v=3.9.1'), []),
        ShipperDirectoryView: createViewLoader('ShipperDirectoryView', () => import('./views/ShipperDirectoryView.js?v=3.9.1'), []),
        CustomerView: createViewLoader('CustomerView', () => import('./views/CustomerView.js?v=3.9.1'), []),
        AdminRbacView: createViewLoader('AdminRbacView', () => import('./views/AdminRbacView.js?v=3.9.1'), []),
        AdminRatingView: createViewLoader('AdminRatingView', () => import('./views/AdminRatingView.js?v=3.9.1'), []),
        ReportView: createViewLoader('ReportView', () => import('./views/ReportView.js?v=3.9.1'), []),
        PaymentView: createViewLoader('PaymentView', () => import('./views/PaymentView.js?v=3.9.1'), []),
        TariffCalculatorView: createViewLoader('TariffCalculatorView', () => import('./views/TariffCalculatorView.js?v=3.9.1'), []),
        NetworkView: createViewLoader('NetworkView', () => import('./views/NetworkView.js?v=3.9.1'), []),
        GuideView: createViewLoader('GuideView', () => import('./views/GuideView.js?v=3.9.1'), []),
        SupportView: createViewLoader('SupportView', () => import('./views/SupportView.js?v=3.9.1'), []),
        UnderDevelopmentView: createViewLoader('UnderDevelopmentView', () => import('./views/UnderDevelopmentView.js?v=3.9.1'), []),
        ErrorView: createViewLoader('ErrorView', () => import('./views/ErrorView.js?v=3.9.1'), []),
        ProfileView: createViewLoader('ProfileView', () => import('./views/ProfileView.js?v=3.9.1'), []),
    };
    const viewError = { template: `<div class="p-6 text-sm text-rose-600" role="alert">Không thể tải giao diện. Vui lòng tải lại trang.</div>` };
    for (const [name, loader] of Object.entries(viewLoaders)) {
        const component = Vue.defineAsyncComponent({ loader, errorComponent: viewError, timeout: 30000 });
        app.component(name, component);
        if (name === 'LoginView') app.component('login-view', component);
    }
    if (window.ChatbotWidget) {
        app.component('ChatbotWidget', window.ChatbotWidget);
        app.component('chatbot-widget', window.ChatbotWidget);
    }
    if (window.ShipmentSmartPasteCard) {
        app.component('ShipmentSmartPasteCard', window.ShipmentSmartPasteCard);
        app.component('shipment-smart-paste-card', window.ShipmentSmartPasteCard);
    }
    if (window.ShipmentPrintModal) {
        app.component('ShipmentPrintModal', window.ShipmentPrintModal);
        app.component('shipment-print-modal', window.ShipmentPrintModal);
    }
    if (window.TripManifestModal) {
        app.component('TripManifestModal', window.TripManifestModal);
        app.component('trip-manifest-modal', window.TripManifestModal);
    }
    if (window.TrackingRecentSearches) {
        app.component('TrackingRecentSearches', window.TrackingRecentSearches);
        app.component('tracking-recent-searches', window.TrackingRecentSearches);
    }
    app.config.errorHandler = (err, vm, info) => {
        console.error('VUE_APP_ERROR:', err, err ? err.stack : '', info);
    };
    const mountedApp = app.mount('#app');
    const initialComponent = mountedApp.activeComponent;
    const initialView = viewLoaders[initialComponent];
    Promise.resolve(initialView ? initialView() : undefined)
        .then(() => nextTick(), error => { console.error('INITIAL_VIEW_LOAD_ERROR:', error); })
        .finally(() => window.WaybillPreloader?.ready());
