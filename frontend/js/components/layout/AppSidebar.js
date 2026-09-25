(function () {
    const template = `
    <aside 
        id="app-sidebar" 
        :style="{ width: isSidebarCollapsed ? '72px' : '260px' }"
        class="h-full bg-white border-r border-slate-200 flex flex-col justify-between smooth-transition relative z-40 shadow-sm flex-shrink-0 !overflow-visible"
    >
        <button 
            @click="$emit('toggle-sidebar')" 
            :title="isSidebarCollapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'" 
            class="absolute -right-3.5 top-5 w-7 h-7 rounded-full bg-white border border-slate-200 shadow-md flex items-center justify-center text-slate-500 hover:text-blue-600 hover:border-blue-300 hover:scale-110 transition smooth-transition z-50 cursor-pointer ring-2 ring-slate-100/80 hover:ring-blue-100"
            aria-label="Thu mở thanh điều hướng bên"
        >
            <svg class="w-3.5 h-3.5 transition-transform duration-200" :class="{ 'rotate-180': isSidebarCollapsed }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M15 19l-7-7 7-7" />
            </svg>
        </button>

        <div>
            <div 
                @click="$emit('logo-click')"
                :title="isSidebarCollapsed ? 'Bấm để mở rộng thanh bên' : 'Về trang Tra cứu bưu gửi'"
                class="h-16 flex items-center px-4 border-b border-slate-100 cursor-pointer hover:bg-slate-50/80 transition"
                :class="{ 'justify-center !px-0': isSidebarCollapsed }"
            >
                <div class="flex items-center space-x-3 overflow-hidden">
                    <div class="w-9 h-9 rounded-xl vnpt-gradient text-white flex items-center justify-center shadow-md shadow-blue-600/25 flex-shrink-0 border border-white/20 select-none">
                        <span class="text-[10px] font-black tracking-tight leading-none">VNPT</span>
                    </div>
                    <div v-show="!isSidebarCollapsed" class="leading-tight overflow-hidden">
                        <div class="font-extrabold text-sm text-slate-900 tracking-tight whitespace-nowrap">
                            Waybill Post
                        </div>
                        <p class="text-[10.5px] text-slate-400 font-medium whitespace-nowrap">Quản trị &amp; Điều phối</p>
                    </div>
                </div>
            </div>

            <div class="p-3 space-y-1">
                <div v-show="!isSidebarCollapsed" class="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Phân Hệ Nghiệp Vụ
                </div>

                <button 
                    v-for="tab in navigationTabs" 
                    :key="tab.id"
                    @click="$emit('switch-tab', tab.id)"
                    :title="isSidebarCollapsed ? tab.name : ''"
                    :class="[
                        'w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs transition smooth-transition cursor-pointer text-left',
                        isSidebarCollapsed ? 'justify-center !px-0 !space-x-0' : '',
                        currentTab === tab.id 
                            ? 'bg-blue-50 text-blue-700 border border-blue-100 shadow-sm shadow-blue-500/10 font-bold' 
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 font-medium'
                    ]"
                >
                    <svg class="w-4 h-4 flex-shrink-0" :class="currentTab === tab.id ? 'text-blue-600' : 'text-slate-400'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="tab.icon || 'M4 6h16M4 12h16M4 18h16'" />
                    </svg>
                    <span v-show="!isSidebarCollapsed" class="truncate">{{ tab.name }}</span>
                </button>
            </div>
        </div>

        <div class="p-3 border-t border-slate-100 bg-slate-50/50">
            <div class="flex items-center justify-between p-1.5 rounded-xl bg-white border border-slate-200 shadow-sm" :class="{ 'justify-center !p-1': isSidebarCollapsed }">
                <button 
                    type="button"
                    @click="$emit('open-profile')"
                    :title="isSidebarCollapsed ? 'Xem & sửa hồ sơ: ' + (currentUser?.fullName || currentUser?.email) : 'Bấm để xem và sửa thông tin cá nhân / Shop'"
                    class="flex items-center space-x-2.5 overflow-hidden text-left hover:bg-slate-50 p-1 rounded-lg transition group flex-1 cursor-pointer"
                >
                    <div class="w-8 h-8 rounded-lg overflow-hidden bg-blue-600 group-hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-sm transition">
                        <img 
                            v-if="currentUser?.avatarUrl" 
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
                    <div v-show="!isSidebarCollapsed" class="leading-tight truncate flex-1">
                        <div class="flex items-center space-x-1">
                            <span class="text-xs font-bold text-slate-800 truncate group-hover:text-blue-600 transition">{{ currentUser?.fullName || currentUser?.email }}</span>
                            <svg class="w-3 h-3 text-slate-400 group-hover:text-blue-500 flex-shrink-0 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                        </div>
                        <div class="text-[10px] text-blue-600 font-semibold truncate">{{ currentUser?.email }}</div>
                    </div>
                </button>

                <button 
                    v-show="!isSidebarCollapsed"
                    @click="$emit('logout')"
                    title="Đăng xuất khỏi hệ thống" 
                    class="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition cursor-pointer flex-shrink-0 ml-1"
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
        props: {
            currentUser: { type: Object, default: null },
            currentTab: { type: String, default: 'tracking' },
            isSidebarCollapsed: { type: Boolean, default: false },
            navigationTabs: { type: Array, default: () => [] }
        },
        emits: ['toggle-sidebar', 'switch-tab', 'logo-click', 'open-profile', 'logout']
    };

    window.AppSidebar = AppSidebar;
})();
