(function () {
    const { ref, computed } = Vue;

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
                    :aria-checked="isKnobDark"
                    @pointerdown="onPointerDown"
                    @pointermove="onPointerMove"
                    @pointerup="onPointerUp"
                    @pointercancel="onPointerCancel"
                    @click="onClick"
                    @keydown="onKeyDown"
                    :title="isDarkMode ? 'Đang bật chế độ Đêm. Bấm hoặc gạt để chuyển sang chế độ Sáng' : 'Đang bật chế độ Sáng. Bấm hoặc gạt để chuyển sang chế độ Đêm'"
                    class="theme-toggle-btn relative inline-flex items-center w-[54px] h-7 rounded-full p-0.5 transition-colors duration-300 cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-blue-500/40 shadow-inner flex-shrink-0 group touch-none"
                    :class="isKnobDark 
                        ? 'bg-slate-900 border border-slate-700/80' 
                        : 'bg-slate-200/90 hover:bg-slate-300/80 border border-slate-300/80'"
                >
                    <!-- Track Ambient: Day Sky Dots / Night Twinkling Stars -->
                    <span class="absolute inset-0 flex items-center pointer-events-none select-none overflow-hidden rounded-full">
                        <!-- Night Twinkling Stars (Visible when Dark on left side) -->
                        <span 
                            class="absolute left-1.5 top-1.5 flex items-center space-x-1 transition-all duration-300"
                            :class="isKnobDark ? 'opacity-100 scale-100' : 'opacity-0 scale-50 pointer-events-none'"
                        >
                            <svg class="w-2 h-2 text-amber-300 animate-twinkle" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 0L14.2 9.8L24 12L14.2 14.2L12 24L9.8 14.2L0 12L9.8 9.8L12 0Z"/>
                            </svg>
                            <svg class="w-1.5 h-1.5 text-blue-200 animate-twinkle-delayed" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 0L14.2 9.8L24 12L14.2 14.2L12 24L9.8 14.2L0 12L9.8 9.8L12 0Z"/>
                            </svg>
                        </span>

                        <!-- Day Warm Sky Dots (Visible when Light on right side) -->
                        <span 
                            class="absolute right-2 top-2 flex items-center space-x-1 transition-all duration-300"
                            :class="!isKnobDark ? 'opacity-80 scale-100' : 'opacity-0 scale-50 pointer-events-none'"
                        >
                            <span class="w-1.5 h-1.5 rounded-full bg-amber-400/50"></span>
                            <span class="w-2 h-2 rounded-full bg-amber-400/80"></span>
                        </span>
                    </span>

                    <!-- Sliding Thumb / Knob with 3D Flip -->
                    <span 
                        class="theme-toggle-knob relative w-6 h-6 rounded-full flex items-center justify-center shadow-md pointer-events-none [perspective:400px]"
                        :class="[
                            isDragging ? 'is-dragging' : '',
                            isKnobDark 
                                ? 'is-dark bg-gradient-to-tr from-blue-600 to-indigo-600 text-amber-300 border border-blue-400/40 shadow-blue-900/40' 
                                : 'bg-white text-amber-500 border border-amber-100 shadow-amber-500/10'
                        ]"
                        :style="knobStyle"
                    >
                        <!-- 3D Card Flipper Container -->
                        <span 
                            class="theme-knob-flipper relative w-full h-full flex items-center justify-center"
                            :class="{ 'rotate-y-180': isKnobDark }"
                        >
                            <!-- Sun Face (Front) -->
                            <span class="absolute inset-0 flex items-center justify-center [backface-visibility:hidden]">
                                <svg class="w-3.5 h-3.5 text-amber-500 transition-transform duration-300 group-hover:rotate-45" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                            </span>
                            <!-- Moon Face (Back) -->
                            <span class="absolute inset-0 flex items-center justify-center [backface-visibility:hidden] [transform:rotateY(180deg)]">
                                <svg class="w-3.5 h-3.5 text-amber-300 transition-transform duration-300 group-hover:-rotate-12" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                                </svg>
                            </span>
                        </span>
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

            const isDragging = ref(false);
            const dragX = ref(null);
            let dragStartX = 2;
            let dragPointerX = null;
            let justSwiped = false;

            const isKnobDark = computed(() => {
                if (isDragging.value && dragX.value !== null) {
                    return dragX.value > 14;
                }
                return isDarkMode.value;
            });

            const currentKnobX = computed(() => {
                if (isDragging.value && dragX.value !== null) {
                    return dragX.value;
                }
                return isDarkMode.value ? 26 : 2;
            });

            const knobStyle = computed(() => ({
                transform: `translateX(${currentKnobX.value}px)`,
                transition: isDragging.value ? 'none' : 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }));

            const handleToggle = (targetMode, origin) => {
                const currentIsDark = window.appStore?.isDarkMode ?? isDarkMode.value;
                const nextMode = typeof targetMode === 'boolean'
                    ? targetMode
                    : !currentIsDark;
                if (window.appStore?.setDarkMode) {
                    window.appStore.setDarkMode(nextMode, origin);
                } else if (typeof document !== 'undefined') {
                    if (nextMode) {
                        document.documentElement.classList.add('dark');
                        localStorage.setItem('theme', 'dark');
                    } else {
                        document.documentElement.classList.remove('dark');
                        localStorage.setItem('theme', 'light');
                    }
                }
                emit('toggle-dark-mode', nextMode, origin);
            };

            const onPointerDown = (e) => {
                if (e.pointerType === 'mouse' && e.button !== 0) return;
                dragPointerX = e.clientX;
                dragStartX = isDarkMode.value ? 26 : 2;
                isDragging.value = false;
                dragX.value = dragStartX;
                justSwiped = false;
                try {
                    e.currentTarget.setPointerCapture(e.pointerId);
                } catch (_) {}
            };

            const onPointerMove = (e) => {
                if (dragPointerX === null) return;
                const dx = e.clientX - dragPointerX;
                if (Math.abs(dx) >= 3) {
                    isDragging.value = true;
                    const targetX = dragStartX + dx;
                    dragX.value = Math.max(2, Math.min(26, targetX));
                }
            };

            const onPointerUp = (e) => {
                if (dragPointerX === null) return;
                try {
                    e.currentTarget.releasePointerCapture(e.pointerId);
                } catch (_) {}

                const dx = e.clientX - dragPointerX;
                const wasDrag = isDragging.value;

                if (wasDrag) {
                    let targetMode;
                    if (Math.abs(dx) >= 8) {
                        targetMode = dx > 0;
                    } else {
                        targetMode = (dragX.value ?? (isDarkMode.value ? 26 : 2)) > 14;
                    }
                    const origin = { x: e.clientX, y: e.clientY };
                    handleToggle(targetMode, origin);
                    justSwiped = true;
                }

                dragPointerX = null;
                isDragging.value = false;
                dragX.value = null;
            };

            const onPointerCancel = () => {
                dragPointerX = null;
                isDragging.value = false;
                dragX.value = null;
            };

            const onClick = (e) => {
                if (justSwiped) {
                    justSwiped = false;
                    return;
                }
                const origin = (e && typeof e.clientX === 'number') 
                    ? { x: e.clientX, y: e.clientY } 
                    : null;
                handleToggle(undefined, origin);
            };

            const onKeyDown = (e) => {
                if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
                    e.preventDefault();
                    let origin = null;
                    if (e.currentTarget && typeof e.currentTarget.getBoundingClientRect === 'function') {
                        const rect = e.currentTarget.getBoundingClientRect();
                        origin = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
                    }
                    handleToggle(undefined, origin);
                }
            };

            return {
                showMobileMenu,
                isDarkMode,
                isKnobDark,
                isDragging,
                knobStyle,
                onPointerDown,
                onPointerMove,
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
