import { reactive } from 'vue';

const isInitialDark = typeof window !== 'undefined' && (
    localStorage.getItem('theme') === 'dark' || 
    (!localStorage.getItem('theme') && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)
);

const state = reactive({
    currentTab: 'tracking',
    previousTab: null,
    currentTrackingCode: '',
    isSidebarCollapsed: typeof window !== 'undefined' ? window.innerWidth < 1024 : false,
    isDarkMode: isInitialDark,
    toast: {
        show: false,
        title: '',
        message: '',
        type: 'info',
        duration: 4000,
        undoCallback: null
    },
    error: {
        code: 200,
        title: '',
        message: ''
    }
});

let toastTimer = null;

let isThemeTransitioning = false;

export const appStore = {
    state,

    get currentTab() { return state.currentTab; },
    get previousTab() { return state.previousTab; },
    get currentTrackingCode() { return state.currentTrackingCode; },
    get isSidebarCollapsed() { return state.isSidebarCollapsed; },
    get isDarkMode() { return state.isDarkMode; },
    get toast() { return state.toast; },
    get error() { return state.error; },

    setDarkMode(targetMode, origin) {
        const nextState = typeof targetMode === 'boolean' ? targetMode : !state.isDarkMode;
        if (state.isDarkMode === nextState) {
            if (typeof window !== 'undefined') {
                if (nextState && !document.documentElement.classList.contains('dark')) {
                    document.documentElement.classList.add('dark');
                } else if (!nextState && document.documentElement.classList.contains('dark')) {
                    document.documentElement.classList.remove('dark');
                }
            }
            return state.isDarkMode;
        }

        const applyTheme = () => {
            state.isDarkMode = nextState;
            if (typeof window !== 'undefined') {
                if (state.isDarkMode) {
                    document.documentElement.classList.add('dark');
                    localStorage.setItem('theme', 'dark');
                } else {
                    document.documentElement.classList.remove('dark');
                    localStorage.setItem('theme', 'light');
                }
                window.dispatchEvent(new CustomEvent('theme-changed', {
                    detail: { isDark: state.isDarkMode }
                }));
            }
        };

        if (isThemeTransitioning) {
            applyTheme();
            return state.isDarkMode;
        }

        // Haptic feedback (subtle vibration on mobile devices)
        if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
            try { navigator.vibrate(20); } catch (_) {}
        }

        // Check for reduced motion preference
        const isReducedMotion = typeof window !== 'undefined' &&
            window.matchMedia &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        // Circular Ripple View Transitions API (Chrome 111+, Edge 111+, Safari 18+)
        if (typeof document !== 'undefined' && document.startViewTransition && !isReducedMotion) {
            try {
                isThemeTransitioning = true;
                const x = (origin && typeof origin.x === 'number') ? origin.x : (window.innerWidth - 60);
                const y = (origin && typeof origin.y === 'number') ? origin.y : 32;
                const endRadius = Math.hypot(
                    Math.max(x, window.innerWidth - x),
                    Math.max(y, window.innerHeight - y)
                );

                const transition = document.startViewTransition(() => {
                    applyTheme();
                });

                if (transition.finished && typeof transition.finished.finally === 'function') {
                    transition.finished.finally(() => {
                        isThemeTransitioning = false;
                    });
                } else {
                    setTimeout(() => { isThemeTransitioning = false; }, 450);
                }

                transition.ready.then(() => {
                    document.documentElement.animate(
                        {
                            clipPath: [
                                `circle(0px at ${x}px ${y}px)`,
                                `circle(${endRadius}px at ${x}px ${y}px)`
                            ]
                        },
                        {
                            duration: 400,
                            easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
                            pseudoElement: '::view-transition-new(root)'
                        }
                    );
                }).catch(() => {
                    isThemeTransitioning = false;
                });

                return nextState;
            } catch (_) {
                isThemeTransitioning = false;
                applyTheme();
                return nextState;
            }
        }

        // Fallback for browsers without View Transitions: Smooth CSS Cross-fade
        if (typeof document !== 'undefined' && !isReducedMotion) {
            isThemeTransitioning = true;
            document.documentElement.classList.add('theme-transitioning');
            applyTheme();
            setTimeout(() => {
                document.documentElement.classList.remove('theme-transitioning');
                isThemeTransitioning = false;
            }, 350);
        } else {
            applyTheme();
        }

        return state.isDarkMode;
    },

    toggleDarkMode(targetMode, origin) {
        if (typeof targetMode === 'boolean') {
            return this.setDarkMode(targetMode, origin);
        }
        return this.setDarkMode(!state.isDarkMode, origin);
    },

    switchTab(tabId) {
        if (tabId === state.currentTab) return;
        state.previousTab = state.currentTab;
        state.currentTab = tabId;
        if (tabId !== 'tracking' && tabId !== 'support') {
            state.currentTrackingCode = '';
        }
    },

    setTrackingCode(code) {
        state.currentTrackingCode = code || '';
    },

    toggleSidebar() {
        state.isSidebarCollapsed = !state.isSidebarCollapsed;
        setTimeout(() => {
            if (window.MapManager && typeof window.MapManager.invalidateSize === 'function') {
                window.MapManager.invalidateSize();
            }
        }, 300);
    },

    showToast(title, message, type = 'info', undoCallback = null) {
        if (toastTimer) clearTimeout(toastTimer);
        state.toast = {
            show: true,
            title: title || '',
            message: message || '',
            type,
            duration: 4000,
            undoCallback
        };
        toastTimer = setTimeout(() => {
            this.hideToast();
        }, 4000);
    },

    hideToast() {
        if (toastTimer) clearTimeout(toastTimer);
        state.toast.show = false;
    },

    showError(code = 404, title = '', message = '') {
        state.error = { code, title, message };
        this.switchTab('error');
    }
};
