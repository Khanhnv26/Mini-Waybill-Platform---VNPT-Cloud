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

export const appStore = {
    state,

    get currentTab() { return state.currentTab; },
    get previousTab() { return state.previousTab; },
    get currentTrackingCode() { return state.currentTrackingCode; },
    get isSidebarCollapsed() { return state.isSidebarCollapsed; },
    get isDarkMode() { return state.isDarkMode; },
    get toast() { return state.toast; },
    get error() { return state.error; },

    toggleDarkMode() {
        state.isDarkMode = !state.isDarkMode;
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
        return state.isDarkMode;
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
