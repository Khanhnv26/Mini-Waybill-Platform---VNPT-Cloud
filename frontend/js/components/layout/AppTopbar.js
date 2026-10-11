(function () {
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

    window.AppTopbar = AppTopbar;
})();
