/**
 * VNPT CLOUD - INTERNAL MASTER LAYOUT
 * Layout khung làm việc dành cho nhân sự nội bộ (Bưu tá, Giao dịch viên, Điều phối Hub, Quản trị).
 * Bố cục Flex Row tràn màn hình, cố định Sidebar và cuộn nội dung độc lập.
 * Angular Equivalent: src/app/layouts/internal-layout/internal-layout.component.ts
 */
(function () {
    const template = `
    <div class="flex h-screen w-full overflow-hidden">
        <!-- Sidebar Navigation -->
        <app-sidebar
            :current-user="currentUser"
            :current-tab="currentTab"
            :is-sidebar-collapsed="isSidebarCollapsed"
            :navigation-tabs="navigationTabs"
            @toggle-sidebar="$emit('toggle-sidebar')"
            @switch-tab="$emit('switch-tab', $event)"
            @logo-click="$emit('logo-click')"
            @open-profile="$emit('open-profile')"
            @logout="$emit('logout')"
        ></app-sidebar>

        <!-- Right Main Shell -->
        <div class="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
            <!-- Topbar Navigation -->
            <app-topbar
                :current-tab-title="currentTabTitle"
                :current-tracking-code="currentTrackingCode"
                :show-notification-dropdown="showNotificationDropdown"
                :notifications="notifications"
                :unread-notifications-count="unreadNotificationsCount"
                @toggle-notifications="$emit('toggle-notifications', $event)"
                @mark-all-read="$emit('mark-all-read')"
                @notification-click="$emit('notification-click', $event)"
            ></app-topbar>

            <!-- Dynamic View Container (Angular: <router-outlet>) -->
            <main class="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50">
                <div class="max-w-7xl mx-auto relative">
                    <slot></slot>
                </div>
            </main>

            <!-- Internal System Footer -->
            <internal-footer></internal-footer>
        </div>
    </div>
    `;

    const InternalLayout = {
        name: 'InternalLayout',
        components: {
            AppSidebar: window.AppSidebar,
            AppTopbar: window.AppTopbar,
            InternalFooter: window.InternalFooter
        },
        template,
        props: {
            currentUser: { type: Object, default: null },
            currentTab: { type: String, default: 'tracking' },
            currentTabTitle: { type: String, default: '' },
            currentTrackingCode: { type: String, default: '' },
            isSidebarCollapsed: { type: Boolean, default: false },
            navigationTabs: { type: Array, default: () => [] },
            showNotificationDropdown: { type: Boolean, default: false },
            notifications: { type: Array, default: () => [] },
            unreadNotificationsCount: { type: Number, default: 0 }
        },
        emits: [
            'toggle-sidebar',
            'switch-tab',
            'logo-click',
            'open-profile',
            'logout',
            'toggle-notifications',
            'mark-all-read',
            'notification-click'
        ]
    };

    window.InternalLayout = InternalLayout;
})();
