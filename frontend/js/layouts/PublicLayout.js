(function () {
    const template = `
    <div class="flex flex-col min-h-screen w-full overflow-x-hidden overflow-y-auto">
        <public-header
            :current-tab="currentTab"
            :public-guest-tabs="publicGuestTabs"
            :is-dark-mode="isDarkMode"
            @toggle-dark-mode="(mode, origin) => $emit('toggle-dark-mode', mode, origin)"
            @switch-tab="$emit('switch-tab', $event)"
            @guest-tab-click="$emit('guest-tab-click', $event)"
        ></public-header>
        <div v-if="notifications.length" class="bg-white border-b border-slate-200 px-4 py-2">
            <div id="notification-bell-dropdown" class="max-w-7xl mx-auto relative flex justify-end" @keydown.esc="$emit('toggle-notifications', $event)">
                <button type="button" @click="$emit('toggle-notifications', $event)" :aria-expanded="showNotificationDropdown"
                    class="inline-flex items-center gap-2 px-3 py-2 text-sm text-blue-700 font-semibold rounded-lg hover:bg-blue-50 focus-visible:ring-2 focus-visible:ring-blue-600">
                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M18 8a6 6 0 00-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg>
                    Tin nhắn hỗ trợ <span v-if="unreadNotificationsCount" class="px-2 py-0.5 rounded-full bg-blue-600 text-white">{{ unreadNotificationsCount }}</span>
                </button>
                <div v-if="showNotificationDropdown" class="absolute right-0 top-full z-50 w-80 max-w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden" @click.stop>
                    <div class="p-3 flex items-center justify-between gap-2 border-b border-slate-200">
                        <span class="font-semibold text-sm text-slate-900">Tin nhắn hỗ trợ</span>
                        <button type="button" @click="$emit('mark-all-read')" class="text-xs text-blue-700 underline">Đánh dấu đã xem</button>
                    </div>
                    <div class="max-h-80 overflow-y-auto">
                        <button v-for="item in notifications" :key="item.id" type="button" @click="$emit('notification-click', item)"
                            class="w-full p-3 text-left text-sm hover:bg-blue-50 border-b border-slate-100" :class="item.isRead ? 'bg-white' : 'bg-blue-50'">
                            <span class="block font-semibold text-slate-900">{{ item.title }}</span>
                            <span class="block break-words text-slate-700">{{ item.message }}</span>
                            <span class="block mt-1 text-xs text-slate-600">{{ item.time }}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
        <main class="flex-1 p-3 sm:p-8 pb-28 sm:pb-8 bg-gradient-to-b from-blue-50/30 via-slate-50 to-slate-100 dark:bg-none dark:!bg-[#0b1329] transition-colors duration-200">
            <div class="max-w-7xl mx-auto relative">
                <slot></slot>
            </div>
        </main>
        <public-footer
            @switch-tab="$emit('switch-tab', $event)"
            @open-desktop-download="$emit('open-desktop-download')"
        ></public-footer>
        <app-bottom-nav
            :current-user="null"
            :current-tab="currentTab"
            :unread-notifications-count="unreadNotificationsCount"
            @switch-tab="$emit('switch-tab', $event)"
            @open-drawer="$emit('switch-tab', 'tracking')"
        ></app-bottom-nav>
    </div>
    `;
    const PublicLayout = {
        name: 'PublicLayout',
        components: {
            PublicHeader: window.PublicHeader,
            PublicFooter: window.PublicFooter,
            AppBottomNav: window.AppBottomNav
        },
        template,
        props: {
            currentTab: { type: String, default: 'tracking' },
            isDarkMode: { type: Boolean, default: false },
            publicGuestTabs: { type: Array, default: () => [] },
            notifications: { type: Array, default: () => [] },
            showNotificationDropdown: { type: Boolean, default: false },
            unreadNotificationsCount: { type: Number, default: 0 }
        },
        emits: ['switch-tab', 'guest-tab-click', 'toggle-dark-mode', 'toggle-notifications', 'notification-click', 'mark-all-read', 'open-desktop-download']
    };
    window.PublicLayout = PublicLayout;
})();
