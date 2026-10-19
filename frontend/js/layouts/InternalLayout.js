(function () {
    const { ref } = Vue;
    const template = `
    <div class="flex h-screen w-full overflow-hidden relative">
        <div
            v-if="isMobileDrawerOpen"
            @click="isMobileDrawerOpen = false"
            class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 md:hidden transition-opacity"
        ></div>
        <app-sidebar
            :current-user="currentUser"
            :current-tab="currentTab"
            :is-sidebar-collapsed="isSidebarCollapsed"
            :is-mobile-drawer-open="isMobileDrawerOpen"
            :navigation-tabs="navigationTabs"
            @toggle-sidebar="$emit('toggle-sidebar')"
            @close-mobile-drawer="isMobileDrawerOpen = false"
            @switch-tab="onMobileSwitchTab"
            @logo-click="onMobileLogoClick"
            @open-profile="onMobileOpenProfile"
            @logout="onMobileLogout"
        ></app-sidebar>
        <div class="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
            <app-topbar
                :current-tab-title="currentTabTitle"
                :current-tracking-code="currentTrackingCode"
                :is-dark-mode="isDarkMode"
                :show-notification-dropdown="showNotificationDropdown"
                :notifications="notifications"
                :unread-notifications-count="unreadNotificationsCount"
                @open-mobile-drawer="isMobileDrawerOpen = true"
                @toggle-dark-mode="(mode, origin) => $emit('toggle-dark-mode', mode, origin)"
                @toggle-notifications="$emit('toggle-notifications', $event)"
                @mark-all-read="$emit('mark-all-read')"
                @notification-click="$emit('notification-click', $event)"
            ></app-topbar>
            <main class="flex-1 overflow-y-auto p-3 sm:p-6 pb-20 sm:pb-6 bg-slate-50 dark:!bg-[#0b1329] transition-colors duration-200">
                <div class="max-w-7xl mx-auto relative">
                    <slot></slot>
                </div>
            </main>
            <internal-footer class="hidden md:flex"></internal-footer>
            <app-bottom-nav
                :current-user="currentUser"
                :current-tab="currentTab"
                :unread-notifications-count="unreadNotificationsCount"
                @switch-tab="onMobileSwitchTab"
                @open-drawer="isMobileDrawerOpen = true"
            ></app-bottom-nav>
        </div>
    </div>
    `;
    const InternalLayout = {
        name: 'InternalLayout',
        components: {
            AppSidebar: window.AppSidebar,
            AppTopbar: window.AppTopbar,
            AppBottomNav: window.AppBottomNav,
            InternalFooter: window.InternalFooter
        },
        template,
        props: {
            currentUser: { type: Object, default: null },
            currentTab: { type: String, default: 'tracking' },
            currentTabTitle: { type: String, default: '' },
            currentTrackingCode: { type: String, default: '' },
            isSidebarCollapsed: { type: Boolean, default: false },
            isDarkMode: { type: Boolean, default: false },
            navigationTabs: { type: Array, default: () => [] },
            showNotificationDropdown: { type: Boolean, default: false },
            notifications: { type: Array, default: () => [] },
            unreadNotificationsCount: { type: Number, default: 0 }
        },
        emits: [
            'toggle-sidebar',
            'toggle-dark-mode',
            'switch-tab',
            'logo-click',
            'open-profile',
            'logout',
            'toggle-notifications',
            'mark-all-read',
            'notification-click'
        ],
        setup(props, { emit }) {
            const isMobileDrawerOpen = ref(false);
            const onMobileSwitchTab = (tabId) => {
                isMobileDrawerOpen.value = false;
                emit('switch-tab', tabId);
            };
            const onMobileLogoClick = () => {
                isMobileDrawerOpen.value = false;
                emit('logo-click');
            };
            const onMobileOpenProfile = () => {
                isMobileDrawerOpen.value = false;
                emit('open-profile');
            };
            const onMobileLogout = () => {
                isMobileDrawerOpen.value = false;
                emit('logout');
            };
            return {
                isMobileDrawerOpen,
                onMobileSwitchTab,
                onMobileLogoClick,
                onMobileOpenProfile,
                onMobileLogout
            };
        }
    };
    window.InternalLayout = InternalLayout;
})();
