(function () {
    const template = `
    <aside 
        id="app-sidebar" 
        :style="{ width: (isSidebarCollapsed && !isMobileDrawerOpen) ? '72px' : '260px' }"
        :class="[
            'fixed md:relative inset-y-0 left-0 h-full bg-white dark:bg-[#0f1a38] border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between smooth-transition z-50 md:z-40 shadow-2xl md:shadow-sm flex-shrink-0 transform transition-transform duration-300 ease-in-out',
            isMobileDrawerOpen ? 'translate-x-0 !w-[268px]' : '-translate-x-full md:translate-x-0'
        ]"
    >
        <button 
            @click="$emit('toggle-sidebar')" 
            :title="isSidebarCollapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'" 
            class="hidden md:flex absolute -right-3.5 top-5 w-7 h-7 rounded-full bg-white dark:bg-[#0f1a38] border border-slate-200 dark:border-slate-700 shadow-md items-center justify-center text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-300 dark:hover:border-blue-500 hover:scale-110 transition smooth-transition z-50 cursor-pointer ring-2 ring-slate-100/80 dark:ring-slate-800 hover:ring-blue-100 dark:hover:ring-blue-900/50"
            aria-label="Thu mở thanh điều hướng bên"
        >
            <svg class="w-3.5 h-3.5 transition-transform duration-200" :class="{ 'rotate-180': isSidebarCollapsed }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M15 19l-7-7 7-7" />
            </svg>
        </button>
        
        <div 
            class="h-16 flex items-center justify-between px-4 border-b border-slate-100 dark:border-slate-800 flex-shrink-0"
            :class="{ 'md:justify-center md:!px-0': isSidebarCollapsed && !isMobileDrawerOpen }"
        >
            <div 
                @click="$emit('logo-click')"
                :title="isSidebarCollapsed ? 'Bấm để mở rộng thanh bên' : 'Về trang Tra cứu bưu gửi'"
                class="flex items-center space-x-3 overflow-hidden cursor-pointer flex-1"
                :class="{ 'md:justify-center md:flex-none': isSidebarCollapsed && !isMobileDrawerOpen }"
            >
                <div class="w-9 h-9 rounded-xl vnpt-gradient text-white flex items-center justify-center shadow-md shadow-blue-600/25 flex-shrink-0 border border-white/20 select-none">
                    <span class="text-[10px] font-black tracking-tight leading-none">WB</span>
                </div>
                <div v-show="!isSidebarCollapsed || isMobileDrawerOpen" class="leading-tight overflow-hidden">
                    <div class="font-extrabold text-sm text-slate-900 dark:text-white tracking-tight whitespace-nowrap">
                        Waybill Post
                    </div>
                    <p class="text-[10.5px] text-slate-400 dark:text-slate-400 font-medium whitespace-nowrap">Quản trị &amp; Điều phối</p>
                </div>
            </div>
            
            <button
                type="button"
                @click="$emit('close-mobile-drawer')"
                class="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                aria-label="Đóng thanh điều hướng"
            >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
        
        <div class="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-3 space-y-1">
            <div v-show="!isSidebarCollapsed || isMobileDrawerOpen" class="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Phân Hệ Nghiệp Vụ
            </div>
            <button 
                v-for="tab in navigationTabs" 
                :key="tab.id"
                @click="$emit('switch-tab', tab.id)"
                :title="(isSidebarCollapsed && !isMobileDrawerOpen) ? (tab.id === 'support' && chatUnread ? tab.name + ' (' + chatUnread + ' tin chưa đọc)' : tab.name) : ''"
                :class="[
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs transition smooth-transition cursor-pointer text-left',
                    (isSidebarCollapsed && !isMobileDrawerOpen) ? 'md:justify-center md:!px-0 md:!gap-0' : '',
                    currentTab === tab.id 
                        ? 'bg-blue-50 dark:bg-blue-600/25 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-500/40 shadow-sm shadow-blue-500/10 font-bold' 
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/50 font-medium'
                ]"
            >
                <div class="relative flex-shrink-0 flex items-center justify-center">
                    <svg class="w-4 h-4" :class="currentTab === tab.id ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="tab.icon || 'M4 6h16M4 12h16M4 18h16'" />
                    </svg>
                    <span 
                        v-if="tab.id === 'support' && chatUnread && isSidebarCollapsed && !isMobileDrawerOpen" 
                        class="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-blue-600 text-white text-[9.5px] font-bold flex items-center justify-center ring-2 ring-white dark:ring-[#0f1a38] shadow-sm pointer-events-none"
                        :aria-label="chatUnread + ' tin hỗ trợ chưa đọc'"
                    >
                        {{ chatUnread > 9 ? '9+' : chatUnread }}
                    </span>
                </div>
                <span v-show="!isSidebarCollapsed || isMobileDrawerOpen" class="truncate flex-1">{{ tab.name }}</span>
                <span 
                    v-if="tab.id === 'support' && chatUnread && (!isSidebarCollapsed || isMobileDrawerOpen)" 
                    class="!ml-auto min-w-[18px] h-[18px] px-1.5 text-[10px] font-bold rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xs flex-shrink-0" 
                    :aria-label="chatUnread + ' tin hỗ trợ chưa đọc'"
                >
                    {{ chatUnread > 99 ? '99+' : chatUnread }}
                </span>
            </button>
        </div>
        
        <div class="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex-shrink-0">
            <div
                class="flex items-center justify-between p-1.5 rounded-xl bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 shadow-sm"
                :class="{ 'md:flex-col md:gap-1.5 md:justify-center md:!p-1.5': isSidebarCollapsed && !isMobileDrawerOpen }"
            >
                <button 
                    type="button"
                    @click="$emit('open-profile')"
                    :title="(isSidebarCollapsed && !isMobileDrawerOpen) ? 'Xem & sửa hồ sơ: ' + (currentUser?.fullName || currentUser?.email) : 'Bấm để xem và sửa thông tin cá nhân / Shop'"
                    class="flex items-center space-x-2.5 overflow-hidden text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 p-1 rounded-lg transition group flex-1 cursor-pointer"
                    :class="{ 'md:flex-none md:!space-x-0': isSidebarCollapsed && !isMobileDrawerOpen }"
                >
                    <div class="w-8 h-8 rounded-lg overflow-hidden bg-blue-600 group-hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-sm transition">
                        <img 
                            v-if="currentUser?.avatarUrl && (currentUser.avatarUrl.startsWith('http') || currentUser.avatarUrl.startsWith('/'))" 
                            :src="currentUser.avatarUrl" 
                            :alt="currentUser.fullName || 'Avatar'" 
                            class="w-full h-full object-cover" 
                            referrerpolicy="no-referrer"
                            @error="currentUser.avatarUrl = null"
                        />
                        <span v-else>
                            {{ (currentUser?.fullName || currentUser?.email || 'U').charAt(0).toUpperCase() }}
                        </span>
                    </div>
                    <div v-show="!isSidebarCollapsed || isMobileDrawerOpen" class="leading-tight truncate flex-1">
                        <span class="text-xs font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition block">{{ currentUser?.fullName || currentUser?.email }}</span>
                        <div class="text-[10px] text-blue-600 dark:text-blue-400 font-semibold truncate">{{ currentUser?.email }}</div>
                    </div>
                </button>
                <button 
                    @click="$emit('logout')"
                    title="Đăng xuất khỏi hệ thống" 
                    class="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer flex-shrink-0"
                    :class="{ 'ml-1': !isSidebarCollapsed || isMobileDrawerOpen }"
                >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                </button>
            </div>
        </div>
    </aside>
    `;
    const AppSidebar = {
        name: 'AppSidebar',
        template,
        setup() {
            const chatUnread = Vue.computed(() => Object.values(window.SupportChatRuntime?.state.unread || {}).reduce((sum, count) => sum + count, 0));
            return { chatUnread };
        },
        props: {
            currentUser: { type: Object, default: null },
            currentTab: { type: String, default: 'tracking' },
            isSidebarCollapsed: { type: Boolean, default: false },
            isMobileDrawerOpen: { type: Boolean, default: false },
            navigationTabs: { type: Array, default: () => [] }
        },
        emits: ['toggle-sidebar', 'close-mobile-drawer', 'switch-tab', 'logo-click', 'open-profile', 'logout']
    };
    window.AppSidebar = AppSidebar;
})();
