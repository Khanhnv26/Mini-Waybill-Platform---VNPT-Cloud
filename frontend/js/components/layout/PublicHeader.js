(function () {
    const { ref } = Vue;

    const template = `
    <header class="bg-white/95 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40 shadow-xs flex-shrink-0">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
            <div class="flex items-center">
                <div @click="$emit('switch-tab', 'tracking')" class="flex items-center space-x-3 cursor-pointer group select-none flex-shrink-0">
                    <div class="w-10 h-10 rounded-xl vnpt-blue-gradient text-white flex items-center justify-center shadow-md shadow-blue-600/25 border border-white/25 flex-shrink-0 transition-transform duration-300 group-hover:scale-105 p-2 overflow-hidden">
                        <svg class="w-full h-full text-white" viewBox="0 0 32 32" fill="none" stroke="currentColor">
                            <circle cx="16" cy="16" r="10" stroke-width="2.2" stroke="white" stroke-dasharray="2 1.5"/>
                            <ellipse cx="16" cy="16" rx="14" ry="5" stroke-width="2" stroke="white" transform="rotate(-30 16 16)"/>
                            <circle cx="16" cy="16" r="3.5" fill="white"/>
                        </svg>
                    </div>
                    <div class="leading-tight">
                        <div class="font-black text-base sm:text-lg text-slate-900 tracking-tight transition-colors duration-200 group-hover:text-blue-600 whitespace-nowrap">
                            Waybill Post
                        </div>
                        <p class="text-[10.5px] text-slate-400 font-medium tracking-tight whitespace-nowrap">Hệ Thống Vận Đơn Bưu Chính</p>
                    </div>
                </div>

                <nav class="hidden md:flex items-center ml-8 lg:ml-12 space-x-1 lg:space-x-1.5 text-xs text-slate-600">
                    <button 
                        v-for="tab in publicGuestTabs"
                        :key="tab.id"
                        type="button"
                        @click="$emit('guest-tab-click', tab)"
                        :class="[
                            'flex items-center space-x-1.5 px-3.5 py-2 rounded-xl transition-colors duration-150 cursor-pointer whitespace-nowrap flex-shrink-0',
                            currentTab === tab.id
                                ? 'text-blue-700 dark:text-blue-200 bg-[#eff6ff] dark:bg-blue-900/60 dark:border dark:border-blue-500/30 font-bold shadow-xs'
                                : 'text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60 font-medium'
                        ]"
                    >
                        <svg class="w-4 h-4 flex-shrink-0" :class="currentTab === tab.id ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-400'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="tab.icon" />
                        </svg>
                        <span class="whitespace-nowrap">{{ tab.name }}</span>
                    </button>
                </nav>
            </div>

            <div class="flex items-center space-x-3 sm:space-x-4 lg:space-x-5 flex-shrink-0">
                <a href="tel:1900545481" class="hidden xl:flex items-center space-x-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors whitespace-nowrap group">
                    <svg class="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                    </svg>
                    <span class="font-semibold text-slate-600 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400">1900 54 54 81</span>
                </a>

                <!-- Theme Toggle Sun/Moon -->
                <button 
                    type="button"
                    @click="$emit('toggle-dark-mode')"
                    :title="isDarkMode ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang chế độ Đêm (Night Mode)'"
                    class="theme-toggle-btn w-9 h-9 rounded-xl border transition-all duration-200 cursor-pointer select-none focus:outline-none flex items-center justify-center flex-shrink-0"
                    :class="isDarkMode 
                        ? 'bg-slate-800/80 hover:bg-slate-700/80 border-slate-700/80 text-amber-400 hover:text-amber-300 hover:border-amber-400/40 shadow-sm' 
                        : 'bg-slate-100/90 hover:bg-slate-200 border-slate-200 text-slate-700 hover:text-blue-600 shadow-xs'"
                >
                    <svg v-if="isDarkMode" class="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    <svg v-else class="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                </button>

                <a 
                    href="/login" 
                    @click.prevent="$emit('switch-tab', 'login')"
                    class="inline-flex items-center space-x-1.5 px-4 sm:px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-600/25 transition-all duration-200 hover:-translate-y-0.5 active:scale-95 cursor-pointer whitespace-nowrap"
                >
                    <svg class="w-4 h-4 transition-transform duration-200 group-hover:rotate-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"/></svg>
                    <span>Đăng Nhập</span>
                </a>

                <button 
                    @click="showMobileMenu = !showMobileMenu" 
                    type="button"
                    class="md:hidden p-2 text-slate-600 hover:text-blue-600 rounded-xl border border-slate-200 cursor-pointer"
                    aria-label="Toggle Menu"
                >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
                </button>
            </div>
        </div>

        <div v-show="showMobileMenu" class="md:hidden border-t border-slate-100 bg-white/95 backdrop-blur-md px-4 py-3 space-y-1 text-xs font-semibold animate-fade-slide">
            <button 
                v-for="tab in publicGuestTabs" 
                :key="tab.id"
                type="button"
                @click="$emit('guest-tab-click', tab); showMobileMenu = false"
                :class="[
                    'flex items-center space-x-2 w-full text-left py-2.5 px-3 rounded-lg transition-colors cursor-pointer',
                    currentTab === tab.id ? 'text-blue-700 bg-[#eff6ff] font-bold' : 'text-slate-700 hover:bg-slate-50'
                ]"
            >
                <svg class="w-4 h-4 flex-shrink-0" :class="currentTab === tab.id ? 'text-blue-600' : 'text-slate-400'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="tab.icon" />
                </svg>
                <span>{{ tab.name }}</span>
            </button>
        </div>
    </header>
    `;

    const PublicHeader = {
        name: 'PublicHeader',
        template,
        props: {
            currentTab: { type: String, default: 'tracking' },
            isDarkMode: { type: Boolean, default: false },
            publicGuestTabs: { type: Array, default: () => [] }
        },
        emits: ['switch-tab', 'guest-tab-click', 'toggle-dark-mode'],
        setup(props) {
            const showMobileMenu = ref(false);
            const isDarkMode = Vue.computed(() => {
                return typeof props.isDarkMode === 'boolean' ? props.isDarkMode : (window.appStore?.isDarkMode ?? document.documentElement.classList.contains('dark'));
            });
            return { showMobileMenu, isDarkMode };
        }
    };

    window.PublicHeader = PublicHeader;
})();
