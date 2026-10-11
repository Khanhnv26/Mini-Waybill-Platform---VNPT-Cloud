(function () {
    const { ref } = Vue;

    const template = `
    <header class="bg-white/95 dark:bg-[#0f1a38]/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 shadow-xs flex-shrink-0 transition-colors duration-200">
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
                        <div class="font-black text-base sm:text-lg text-slate-900 dark:text-white tracking-tight transition-colors duration-200 group-hover:text-blue-600 whitespace-nowrap">
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

                <!-- Day/Night Sliding Capsule Switch -->
                <button 
                    type="button"
                    role="switch"
                    :aria-checked="isDarkMode"
                    @pointerdown="onPointerDown"
                    @pointerup="onPointerUp"
                    @pointercancel="onPointerCancel"
                    @click="onClick"
                    @keydown="onKeyDown"
                    :title="isDarkMode ? 'Đang bật chế độ Đêm. Bấm hoặc gạt để chuyển sang chế độ Sáng' : 'Đang bật chế độ Sáng. Bấm hoặc gạt để chuyển sang chế độ Đêm'"
                    class="theme-toggle-btn relative inline-flex items-center w-[54px] h-7 rounded-full p-0.5 transition-all duration-300 cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-blue-500/40 shadow-2xs flex-shrink-0 group touch-none"
                    :class="isDarkMode 
                        ? 'bg-slate-900 border border-slate-700/80 shadow-inner' 
                        : 'bg-slate-200/90 hover:bg-slate-300/80 border border-slate-300/80 shadow-inner'"
                >
                    <!-- Track Ambient Icons -->
                    <span class="absolute inset-0 flex items-center justify-between px-1.5 pointer-events-none select-none">
                        <svg class="w-3.5 h-3.5 transition-opacity duration-300" :class="isDarkMode ? 'opacity-40 text-amber-400' : 'opacity-0'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        <svg class="w-3.5 h-3.5 transition-opacity duration-300" :class="isDarkMode ? 'opacity-0' : 'opacity-40 text-slate-500'" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                        </svg>
                    </span>

                    <!-- Sliding Thumb / Knob -->
                    <span 
                        class="theme-toggle-knob relative w-6 h-6 rounded-full flex items-center justify-center transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] shadow-md pointer-events-none"
                        :class="isDarkMode 
                            ? 'is-dark translate-x-[26px] bg-gradient-to-tr from-blue-600 to-indigo-600 text-amber-300 border border-blue-400/30' 
                            : 'translate-x-0.5 bg-white text-amber-500 border border-slate-200/80'"
                        :style="{ transform: isDarkMode ? 'translateX(26px)' : 'translateX(2px)' }"
                    >
                        <svg v-if="!isDarkMode" class="w-3.5 h-3.5 transition-transform duration-300 group-hover:rotate-45" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        <svg v-else class="w-3.5 h-3.5 transition-transform duration-300 group-hover:-rotate-12" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                        </svg>
                    </span>
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
        setup(props, { emit }) {
            const showMobileMenu = ref(false);
            const isDarkMode = Vue.computed(() => {
                if (window.appStore && typeof window.appStore.isDarkMode === 'boolean') {
                    return window.appStore.isDarkMode;
                }
                return typeof props.isDarkMode === 'boolean'
                    ? props.isDarkMode
                    : (typeof document !== 'undefined' && document.documentElement.classList.contains('dark'));
            });

            let pointerStartX = 0;
            let pointerStartTime = 0;
            let isPointerActive = false;
            let wasHandledByPointer = false;

            const handleToggle = (targetMode) => {
                const nextMode = typeof targetMode === 'boolean'
                    ? targetMode
                    : !isDarkMode.value;
                if (window.appStore?.setDarkMode) {
                    window.appStore.setDarkMode(nextMode);
                } else if (typeof document !== 'undefined') {
                    if (nextMode) {
                        document.documentElement.classList.add('dark');
                        localStorage.setItem('theme', 'dark');
                    } else {
                        document.documentElement.classList.remove('dark');
                        localStorage.setItem('theme', 'light');
                    }
                }
                emit('toggle-dark-mode', nextMode);
            };

            const onPointerDown = (e) => {
                pointerStartX = e.clientX;
                pointerStartTime = Date.now();
                isPointerActive = true;
                wasHandledByPointer = false;
            };

            const onPointerUp = (e) => {
                if (!isPointerActive) return;
                isPointerActive = false;
                wasHandledByPointer = true;
                const deltaX = e.clientX - pointerStartX;

                if (Math.abs(deltaX) > 6) {
                    // Swiped/dragged horizontally ("gạt")
                    if (deltaX > 0) {
                        handleToggle(true);
                    } else {
                        handleToggle(false);
                    }
                } else {
                    // Click/tap
                    handleToggle();
                }
                setTimeout(() => { wasHandledByPointer = false; }, 120);
            };

            const onPointerCancel = () => {
                isPointerActive = false;
            };

            const onClick = (e) => {
                if (wasHandledByPointer) return;
                handleToggle();
            };

            const onKeyDown = (e) => {
                if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
                    e.preventDefault();
                    handleToggle();
                }
            };

            return {
                showMobileMenu,
                isDarkMode,
                onPointerDown,
                onPointerUp,
                onPointerCancel,
                onClick,
                onKeyDown,
                handleToggle
            };
        }
    };

    window.PublicHeader = PublicHeader;
})();
