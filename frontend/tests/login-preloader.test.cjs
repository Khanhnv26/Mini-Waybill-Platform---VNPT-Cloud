const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function harness({ staff = true, redirect = null, success = true, destinationWork } = {}) {
    const calls = [], ticks = [], session = new Map();
    if (redirect) session.set('redirectAfterLogin', redirect);
    const user = { id: 12, fullName: 'Fixture User' };
    const context = {
        console,
        viewLoaders: destinationWork ? { DashboardView: () => destinationWork } : {},
        activeComponent: { value: 'DashboardView' },
        currentUser: { value: null },
        fetchNotifications: () => calls.push('notifications'),
        navigateTo: target => calls.push(['navigate', target]),
        nextTick: fn => ticks.push(fn),
        sessionStorage: { getItem: key => session.get(key) || null, removeItem: key => session.delete(key) },
        Auth: { isInternalStaff: () => staff, getUser: () => user, setSession: () => calls.push('session') },
        Api: { post: async () => ({ ok: success, status: success ? 200 : 401,
            json: async () => success ? { accessToken: 'fixture-token', user } : { message: 'fixture: invalid credentials' } }) },
        window: { addEventListener() {}, removeEventListener() {},
            WaybillPreloader: { show() { calls.push('show'); return () => calls.push('ready'); } } },
        Vue: { ref: value => ({ value }), reactive: value => value,
            computed: fn => ({ get value() { return fn(); } }), watch() {}, onMounted() {}, onUnmounted() {}, nextTick() {} }
    };
    const app = fs.readFileSync(require.resolve('../js/app.js'), 'utf8');
    const start = app.indexOf('            const handleLoginSuccess =');
    const end = app.indexOf('            const handleGuestTabClick =', start);
    vm.runInNewContext(app.slice(start, end) + '\nglobalThis.loginSuccess = handleLoginSuccess;', context);
    vm.runInNewContext(fs.readFileSync(require.resolve('../js/views/LoginView.js'), 'utf8'), context);
    const login = context.window.LoginView.setup({ isDarkMode: false }, { emit: (name, data) => {
        if (name === 'login-success') context.loginSuccess(data);
    } });
    login.loginForm.email = 'fixture@example.test'; login.loginForm.password = 'fixture-only';
    return { login, calls, ticks, session };
}

for (const [name, options, target] of [
    ['staff dashboard', {}, '/dashboard'],
    ['saved destination', { redirect: '/payment' }, '/payment'],
    ['customer tracking', { staff: false }, '/tracking']
]) {
    test(`successful login shows preload and navigates once to ${name}`, async () => {
        const h = harness(options);
        await h.login.handleEmailLogin();
        assert.deepEqual(h.calls.filter(Array.isArray).map(call => Array.from(call)), [['navigate', target]]);
        assert.equal(h.calls.filter(call => call === 'show').length, 1);
        assert.ok(h.calls.indexOf('session') < h.calls.indexOf('show'));
        assert.equal(h.calls.includes('ready'), false);
        assert.equal(h.session.has('redirectAfterLogin'), false);
        for (const mount of h.ticks) mount();
        assert.equal(h.calls.filter(call => call === 'ready').length, 1);
    });
}

test('failed login keeps the form and does not start preload or navigate', async () => {
    const h = harness({ success: false });
    await h.login.handleEmailLogin();
    assert.equal(h.calls.length, 0);
    assert.match(h.login.alert.message, /invalid credentials/);
});

test('login keeps the scene until the lazy destination loads and its render tick completes', async () => {
    let resolveView;
    const destinationWork = new Promise(resolve => { resolveView = resolve; });
    const h = harness({ destinationWork });
    await h.login.handleEmailLogin();
    assert.equal(h.ticks.length, 0);
    assert.equal(h.calls.includes('ready'), false);
    resolveView();
    for (let i = 0; i < 10; i++) await Promise.resolve();
    assert.equal(h.ticks.length, 1);
    assert.equal(h.calls.includes('ready'), false);
    h.ticks[0]();
    assert.equal(h.calls.filter(call => call === 'ready').length, 1);
});

test('slow dashboard data does not block entering the mounted dashboard after 1500 ms', async () => {
    const { fakeClock } = require('./helpers/fake-clock.cjs');
    const clock = fakeClock(), mounts = [];
    const host = { hidden: true, innerHTML: '', replaceChildren() { this.innerHTML = ''; } };
    let resolveData, requested = 0, settled = false;
    const data = new Promise(resolve => { resolveData = resolve; });
    data.then(() => { settled = true; });
    const context = {
        console, ...clock,
        document: { getElementById: id => id === 'waybill-preloader' ? host : null,
            addEventListener() {}, removeEventListener() {} },
        Vue: { ref: value => ({ value }), reactive: value => value,
            computed: fn => ({ get value() { return fn(); } }), watch() {}, onMounted: fn => mounts.push(fn) },
        Auth: { hasRole: role => role === 'ADMIN' },
        ShipmentService: { getAll: () => { requested++; return data; } },
        window: {}
    };
    vm.runInNewContext(fs.readFileSync(require.resolve('../js/components/preloader.js'), 'utf8'), context);
    vm.runInNewContext(fs.readFileSync(require.resolve('../js/views/DashboardView.js'), 'utf8'), context);
    context.window.DashboardView.setup({ currentUser: { roles: ['ROLE_ADMIN'] } }, { emit() {} });
    const release = context.window.WaybillPreloader.show();
    for (const mount of mounts) mount();
    release();
    await clock.advance(1499);
    assert.equal(host.hidden, false);
    assert.equal(requested, 1, 'only the selected dashboard role should request shipments');
    assert.equal(settled, false);
    await clock.advance(1);
    assert.equal(host.hidden, true, 'mounted dashboard must be accessible while its data is pending');
    assert.equal(clock.pending, 0);
    resolveData([]);
    for (let i = 0; i < 10; i++) await Promise.resolve();
    assert.equal(settled, true);
});
