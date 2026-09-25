(function () {
    const template = `
    <header class="h-16 bg-white border-b border-slate-200 pl-8 pr-6 flex items-center justify-between flex-shrink-0 relative z-20">
        <div class="flex items-center space-x-2 text-xs">
            <span class="text-slate-400">Nền Tảng</span>
            <span class="text-slate-300">/</span>
            <span class="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                {{ currentTabTitle }}
            </span>
            <span v-if="currentTrackingCode" class="text-slate-300">/</span>
            <span v-if="currentTrackingCode" class="font-mono text-slate-500 font-semibold">{{ currentTrackingCode }}</span>
        </div>

        <div class="flex items-center space-x-3">
            <a href="tel:1900545481" class="hidden sm:flex text-xs font-semibold text-slate-600 hover:text-blue-600 items-center space-x-1.5 transition">
                <svg class="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <span>Hotline: 1900 54 54 81</span>
            </a>

            <div class="h-4 w-px bg-slate-200 hidden sm:block"></div>

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
                                        <span>Mã bưu gửi: {{ item.trackingCode }}</span>
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
            showNotificationDropdown: { type: Boolean, default: false },
            notifications: { type: Array, default: () => [] },
            unreadNotificationsCount: { type: Number, default: 0 }
        },
        emits: ['toggle-notifications', 'mark-all-read', 'notification-click']
    };

    window.AppTopbar = AppTopbar;
})();
