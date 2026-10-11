import { reactive, computed } from 'vue';

const readInitialUser = () => {
    try {
        const raw = localStorage.getItem('user');
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
};

const state = reactive({
    currentUser: readInitialUser(),
    token: localStorage.getItem('accessToken') || null,
});

export const authStore = {
    state,
    
    get currentUser() {
        return state.currentUser;
    },

    get isAuthenticated() {
        return Boolean(state.token && state.currentUser);
    },

    setSession(token, user) {
        state.token = token || null;
        state.currentUser = user || null;
        if (token) localStorage.setItem('accessToken', token);
        else localStorage.removeItem('accessToken');

        if (user) localStorage.setItem('user', JSON.stringify(user));
        else localStorage.removeItem('user');

        if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
            window.dispatchEvent(new CustomEvent('auth:changed'));
        }
    },

    logout() {
        this.setSession(null, null);
        localStorage.removeItem('user');
        localStorage.removeItem('auth_user');
        localStorage.removeItem('accessToken');
    },

    updateUser(patch) {
        if (!state.currentUser || !patch) return;
        state.currentUser = { ...state.currentUser, ...patch };
        localStorage.setItem('user', JSON.stringify(state.currentUser));
    },

    hasRole(role) {
        if (!state.currentUser) return false;
        const roles = state.currentUser.roles || [];
        const normalized = String(role || '').toUpperCase();
        return roles.some(r => {
            const up = String(r).toUpperCase();
            return up === normalized || up === 'ROLE_' + normalized || 'ROLE_' + up === normalized;
        });
    },

    hasAnyRole(roles = []) {
        return roles.some(role => this.hasRole(role));
    },

    hasPermission(permission) {
        if (!state.currentUser) return false;
        if (this.hasRole('ADMIN')) return true;
        const perms = state.currentUser.permissions || [];
        return perms.includes(permission);
    },

    get stationContext() {
        const u = state.currentUser;
        if (!u) return { locationCode: '', postOfficeCode: '', hubCode: '', primaryCode: '', hasStation: false };
        const loc = String(u.locationCode || '').trim();
        const post = loc.startsWith('POST-') ? loc : (u.postOfficeCode || '');
        const hub = loc.startsWith('HUB-') ? loc : (u.hubCode || '');
        const primary = loc || post || hub || '';
        return {
            locationCode: loc,
            postOfficeCode: post,
            hubCode: hub,
            primaryCode: primary,
            hasStation: Boolean(primary)
        };
    }
};

// Đồng bộ khi có sự kiện bên ngoài
if (typeof window !== 'undefined') {
    window.addEventListener('auth:changed', () => {
        state.currentUser = readInitialUser();
        state.token = localStorage.getItem('accessToken') || null;
    });
}
