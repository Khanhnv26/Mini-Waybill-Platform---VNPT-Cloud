(function () {
    const { computed } = Vue;
    const template = `
    <nav 
        id="app-bottom-nav" 
        class="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#0f1a38]/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] px-2 h-16 flex items-center justify-around select-none transition-colors duration-200"
        role="navigation"
        aria-label="Điều hướng chính trên di động"
    >
        <template v-for="tab in visibleTabs" :key="tab.id + (tab.isCenterAction ? '-center' : '')">
            <button
                v-if="tab.isCenterAction"
                type="button"
                @click="handleTabClick(tab)"
                :title="tab.name"
                class="flex flex-col items-center justify-center -mt-5 focus:outline-none cursor-pointer group shrink-0 px-2"
                :aria-label="tab.name"
            >
                <div class="w-12 h-12 rounded-full vnpt-gradient text-white flex items-center justify-center shadow-lg shadow-blue-600/35 border-2 border-white dark:border-slate-900 group-active:scale-90 transition-transform">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="tab.icon" />
                    </svg>
                </div>
                <span class="text-[9.5px] font-bold text-blue-600 dark:text-blue-400 mt-0.5 tracking-tight">
                    {{ tab.name }}
                </span>
            </button>

            <button
                v-else
                type="button"
                @click="handleTabClick(tab)"
                class="flex-1 flex flex-col items-center justify-center py-1 min-h-[44px] cursor-pointer transition-colors relative"
                :class="currentTab === tab.id 
                    ? 'text-blue-600 dark:text-blue-400 font-bold' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'"
                :aria-current="currentTab === tab.id ? 'page' : undefined"
            >
                <div class="relative">
                    <svg class="w-5 h-5 transition-transform" :class="{ 'scale-110': currentTab === tab.id }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="tab.icon" />
                    </svg>
                    <span 
                        v-if="getTabBadge(tab)"
                        :class="['absolute -top-1 -right-2 px-1 min-w-[14px] h-3.5 rounded-full text-white text-[9px] font-black flex items-center justify-center shadow-xs', getTabBadge(tab).colorClass]"
                    >
                        {{ getTabBadge(tab).count > 99 ? '99+' : getTabBadge(tab).count }}
                    </span>
                    <span 
                        v-if="currentTab === tab.id"
                        class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-600 dark:bg-blue-400"
                    ></span>
                </div>
                <span class="text-[10px] tracking-tight mt-1 truncate max-w-[64px] font-medium leading-none">
                    {{ tab.name }}
                </span>
            </button>
        </template>
    </nav>
    `;

    const AppBottomNav = {
        name: 'AppBottomNav',
        template,
        props: {
            currentUser: { type: Object, default: null },
            currentTab: { type: String, default: 'tracking' },
            unreadNotificationsCount: { type: Number, default: 0 }
        },
        emits: [
            'switch-tab',
            'open-drawer'
        ],
        setup(props, { emit }) {
            const isShipper = computed(() => {
                return typeof Auth !== 'undefined' && typeof Auth.isShipper === 'function' && Auth.isShipper();
            });

            const isStaff = computed(() => {
                return typeof Auth !== 'undefined' && typeof Auth.isInternalStaff === 'function' && Auth.isInternalStaff();
            });

            const visibleTabs = computed(() => {
                if (!props.currentUser) {
                    return [
                        {
                            id: 'tracking',
                            name: 'Tra Cứu',
                            icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'
                        },
                        {
                            id: 'calculator',
                            name: 'Tính Cước',
                            icon: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z'
                        },
                        {
                            id: 'tracking',
                            isCenterAction: true,
                            name: 'Tra Cứu',
                            icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'
                        },
                        {
                            id: 'support',
                            name: 'Hỗ Trợ',
                            icon: 'M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z'
                        },
                        {
                            id: 'login',
                            name: 'Đăng Nhập',
                            icon: 'M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1'
                        }
                    ];
                }

                if (isShipper.value) {
                    return [
                        {
                            id: 'tracking',
                            name: 'Tra Cứu',
                            icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'
                        },
                        {
                            id: 'shipper',
                            name: 'Giao Hàng',
                            icon: 'M13 10V3L4 14h7v7l9-11h-7z'
                        },
                        {
                            id: 'shipper',
                            isCenterAction: true,
                            name: 'Phát Hàng',
                            icon: 'M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z'
                        },
                        {
                            id: 'trips',
                            name: 'Chuyến Xe',
                            icon: 'M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8h4.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h2a1 1 0 001-1'
                        },
                        {
                            id: 'drawer',
                            name: 'Menu',
                            isDrawerTrigger: true,
                            badgeCount: props.unreadNotificationsCount,
                            icon: 'M4 6h16M4 12h16M4 18h16'
                        }
                    ];
                }

                if (isStaff.value) {
                    return [
                        {
                            id: 'dashboard',
                            name: 'Điều Hành',
                            icon: 'M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10-5a1 1 0 011-1h4a1 1 0 011 1v9a1 1 0 01-1 1h-4a1 1 0 01-1-1v-9z'
                        },
                        {
                            id: 'tracking',
                            name: 'Tra Cứu',
                            icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'
                        },
                        {
                            id: 'shipment',
                            isCenterAction: true,
                            name: 'Tạo Đơn',
                            icon: 'M12 4v16m8-8H4'
                        },
                        {
                            id: 'shipment',
                            name: 'Vận Đơn',
                            icon: 'M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
                        },
                        {
                            id: 'drawer',
                            name: 'Menu',
                            isDrawerTrigger: true,
                            badgeCount: props.unreadNotificationsCount,
                            icon: 'M4 6h16M4 12h16M4 18h16'
                        }
                    ];
                }

                return [
                    {
                        id: 'tracking',
                        name: 'Tra Cứu',
                        icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'
                    },
                    {
                        id: 'shipment',
                        name: 'Đơn Hàng',
                        icon: 'M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
                    },
                    {
                        id: 'shipment',
                        isCenterAction: true,
                        name: 'Tạo Đơn',
                        icon: 'M12 4v16m8-8H4'
                    },
                    {
                        id: 'calculator',
                        name: 'Cước Phí',
                        icon: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z'
                    },
                    {
                        id: 'drawer',
                        name: 'Menu',
                        isDrawerTrigger: true,
                        badgeCount: props.unreadNotificationsCount,
                        icon: 'M4 6h16M4 12h16M4 18h16'
                    }
                ];
            });

            const handleTabClick = (tab) => {
                if (tab.isDrawerTrigger) {
                    emit('open-drawer');
                    return;
                }
                emit('switch-tab', tab.id);
            };

            const getTabBadge = (tab) => {
                if (!tab) return null;
                if (tab.isDrawerTrigger) {
                    if (props.unreadNotificationsCount > 0) {
                        return {
                            count: props.unreadNotificationsCount,
                            colorClass: 'bg-rose-500'
                        };
                    }
                    return null;
                }
                if (tab.isCenterAction) {
                    return null;
                }
                if (window.badgeStore && typeof window.badgeStore.getBadge === 'function') {
                    return window.badgeStore.getBadge(tab.id);
                }
                return null;
            };

            return {
                visibleTabs,
                handleTabClick,
                getTabBadge
            };
        }
    };

    window.AppBottomNav = AppBottomNav;
})();
