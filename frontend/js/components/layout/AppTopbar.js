(function () {
    const { ref, computed } = Vue;
    const template = `
    <header class="h-16 bg-white dark:bg-[#0f1a38] border-b border-slate-200 dark:border-slate-800 pl-8 pr-6 flex items-center justify-between flex-shrink-0 relative z-20 transition-colors duration-200">
        <div class="flex items-center space-x-2 text-xs min-w-0 mr-3">
            <span class="text-slate-400 dark:text-slate-400 flex-shrink-0">Nền Tảng</span>
            <span class="text-slate-300 dark:text-slate-600 flex-shrink-0">/</span>
            <span class="font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/50 px-2 py-0.5 rounded-md flex-shrink-0">
                {{ currentTabTitle }}
            </span>
            <span v-if="currentTrackingCode" class="text-slate-300 dark:text-slate-600 flex-shrink-0">/</span>
            <span v-if="currentTrackingCode" :title="currentTrackingCode" class="font-mono text-slate-500 dark:text-slate-400 font-semibold truncate max-w-[140px] sm:max-w-[240px]">{{ currentTrackingCode }}</span>
        </div>

        <div class="flex items-center space-x-3">
            <a href="tel:1900545481" class="hidden sm:flex text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 items-center space-x-1.5 transition">
                <svg class="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <span>Hotline: 1900 54 54 81</span>
            </a>

            <div class="h-4 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block"></div>

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

            <div class="relative z-50" id="notification-bell-dropdown">
                <button 
                    type="button"
                    @click="$emit('toggle-notifications', $event)"
                    :title="unreadNotificationsCount > 0 ? unreadNotificationsCount + ' thông báo mới' : 'Thông báo hệ thống'"
                    class="relative p-2 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-slate-100 transition cursor-pointer select-none focus:outline-none"
                >
                    <svg class="w-5 h-5 transition-transform" :class="{ 'bell-ring-active text-blue-600': unreadNotificationsCount > 0 }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    <span 
                        v-if="unreadNotificationsCount > 0" 
                        class="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white font-black text-[10px] rounded-full flex items-center justify-center ring-2 ring-white shadow-sm animate-pulse"
                    >
                        {{ unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount }}
                    </span>
                </button>

                <Transition name="dropdown">
                    <div 
                        v-if="showNotificationDropdown"
                        class="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 text-slate-800"
                    >
                        <div class="p-3.5 px-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
                            <div class="flex items-center space-x-2">
                                <span class="font-bold text-xs text-slate-800 uppercase tracking-tight">Thông Báo Hệ Thống</span>
                                <span v-if="unreadNotificationsCount > 0" class="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">
                                    {{ unreadNotificationsCount }} mới
                                </span>
                            </div>
                            <button 
                                v-if="unreadNotificationsCount > 0"
                                type="button"
                                @click="$emit('mark-all-read')"
                                class="text-[11px] font-semibold text-blue-600 hover:text-blue-800 transition cursor-pointer"
                            >
                                Đã đọc tất cả
                            </button>
                        </div>

                        <div class="max-h-80 overflow-y-auto divide-y divide-slate-100">
                            <div 
                                v-for="item in notifications" 
                                :key="item.id"
                                @click="$emit('notification-click', item)"
                                :class="[
                                    'p-3 px-4 flex items-start space-x-3 hover:bg-slate-50 transition cursor-pointer text-left',
                                    !item.isRead ? 'bg-blue-50/30' : ''
                                ]"
                            >
                                <div :class="['w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-white text-xs shadow-sm mt-0.5', item.iconBg || 'bg-blue-600']">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="item.icon" />
                                    </svg>
                                </div>
                                <div class="flex-1 min-w-0">
                                    <div class="flex items-center justify-between">
                                        <h4 class="text-xs font-bold text-slate-800 truncate" :class="{ 'text-blue-900 font-extrabold': !item.isRead }">
                                            {{ item.title }}
                                        </h4>
                                        <span class="text-[10px] text-slate-400 flex-shrink-0 ml-2 whitespace-nowrap">{{ item.time }}</span>
                                    </div>
                                    <p class="text-[11px] text-slate-500 mt-0.5 leading-snug line-clamp-2">
                                        {{ item.message }}
                                    </p>
                                    <div v-if="item.trackingCode" class="mt-1 inline-flex items-center space-x-1 text-[10.5px] text-blue-600 hover:text-blue-800 font-semibold font-mono">
                                        <span>{{ item.trackingLabel || 'Mã bưu gửi:' }} {{ item.trackingCode }}</span>
                                        <span>&rarr;</span>
                                    </div>
                                </div>
                                <div v-if="!item.isRead" class="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0 mt-1.5 shadow-sm"></div>
                            </div>

                            <div v-if="notifications.length === 0" class="p-8 text-center text-slate-400 text-xs">
                                <svg class="w-8 h-8 mx-auto mb-2 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                </svg>
                                Chưa có thông báo mới nào dành cho tài khoản của bạn
                            </div>
                        </div>
                    </div>
                </Transition>
            </div>
        </div>
    </header>
    `;

    const AppTopbar = {
        name: 'AppTopbar',
        template,
        props: {
            currentTabTitle: { type: String, default: 'Tra Cứu Bưu Gửi' },
            currentTrackingCode: { type: String, default: '' },
            isDarkMode: { type: Boolean, default: false },
            showNotificationDropdown: { type: Boolean, default: false },
            notifications: { type: Array, default: () => [] },
            unreadNotificationsCount: { type: Number, default: 0 }
        },
        emits: ['toggle-notifications', 'mark-all-read', 'notification-click', 'toggle-dark-mode'],
        setup(props, { emit }) {
            const isDarkMode = computed(() => {
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
                    const finalX = dragX.value ?? (isDarkMode.value ? 26 : 2);
                    let targetMode;
                    if (dx >= 8) {
                        targetMode = true;
                    } else if (dx <= -8) {
                        targetMode = false;
                    } else {
                        targetMode = finalX > 14;
                    }
                    const origin = { x: e.clientX, y: e.clientY };
                    handleToggle(targetMode, origin);
                    justSwiped = true;
                    setTimeout(() => {
                        justSwiped = false;
                    }, 300);
                }

                dragPointerX = null;
                isDragging.value = false;
                dragX.value = null;
            };

            const onPointerCancel = () => {
                dragPointerX = null;
                isDragging.value = false;
                dragX.value = null;
                justSwiped = false;
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

    window.AppTopbar = AppTopbar;
})();
