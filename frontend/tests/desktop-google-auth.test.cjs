const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function createHarness({ isTauri = true, desktopSessionParam = null } = {}) {
    const calls = [];
    const context = {
        console,
        URLSearchParams,
        window: {
            isTauri,
            location: {
                origin: 'http://localhost:3000',
                search: desktopSessionParam ? `?desktopSession=${desktopSessionParam}` : ''
            },
            open: (url, target) => calls.push(['window.open', url, target]),
            addEventListener() {},
            removeEventListener() {},
            __TAURI__: {
                core: {
                    invoke: async (cmd, args) => {
                        calls.push(['tauri.invoke', cmd, args]);
                        return true;
                    }
                }
            }
        },
        document: {
            getElementById: () => null,
            documentElement: { classList: { contains: () => false } }
        },
        localStorage: {
            getItem: () => null,
            setItem: () => {}
        },
        sessionStorage: {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {}
        },
        Auth: {
            isInternalStaff: () => true,
            getUser: () => ({ id: 1 }),
            setSession: (token, user) => calls.push(['setSession', token, user])
        },
        Api: {
            post: async (url, body) => {
                calls.push(['Api.post', url, body]);
                if (url.includes('/desktop-session/init')) {
                    return {
                        ok: true,
                        status: 200,
                        json: async () => ({
                            sessionId: 'test-session-123',
                            loginUrl: 'http://localhost:3000/login.html?desktopSession=test-session-123',
                            expiresInSeconds: 300
                        })
                    };
                }
                if (url.includes('/desktop-session/complete')) {
                    return {
                        ok: true,
                        status: 200,
                        json: async () => ({
                            accessToken: 'token-desktop-success',
                            userId: 99,
                            email: 'user@example.com'
                        })
                    };
                }
                return { ok: true, status: 200, json: async () => ({}) };
            },
            get: async (url) => {
                calls.push(['Api.get', url]);
                return {
                    ok: true,
                    status: 200,
                    json: async () => ({
                        status: 'SUCCESS',
                        auth: {
                            accessToken: 'token-polled-success',
                            userId: 100,
                            email: 'polled@example.com'
                        }
                    })
                };
            }
        },
        Vue: {
            ref: value => ({ value }),
            reactive: value => value,
            computed: fn => ({ get value() { return fn(); } }),
            watch() {},
            onMounted() {},
            onUnmounted() {},
            nextTick: (fn) => fn && fn()
        }
    };

    const loginViewCode = fs.readFileSync(require.resolve('../js/views/LoginView.js'), 'utf8');
    vm.runInNewContext(loginViewCode, context);

    let emitted = null;
    const login = context.window.LoginView.setup({ isDarkMode: false }, {
        emit: (event, data) => { emitted = { event, data }; }
    });

    return { login, calls, context, getEmitted: () => emitted };
}

test('LoginView recognizes Desktop App environment', () => {
    const h = createHarness({ isTauri: true });
    assert.equal(h.login.isDesktopApp.value, true);

    const hWeb = createHarness({ isTauri: false });
    hWeb.context.window.__TAURI__ = null;
    assert.equal(hWeb.login.isDesktopApp.value, false);
});

test('Desktop Google Login initializes session and opens system browser via Tauri invoke', async () => {
    const h = createHarness({ isTauri: true });
    await h.login.handleDesktopGoogleLogin();

    const postCall = h.calls.find(c => c[0] === 'Api.post' && c[1].includes('/desktop-session/init'));
    assert.ok(postCall, 'Must call desktop session init');

    const invokeCall = h.calls.find(c => c[0] === 'tauri.invoke' && c[1] === 'open_in_browser');
    assert.ok(invokeCall, 'Must invoke open_in_browser');
    assert.equal(invokeCall[2].url, 'http://localhost:3000/login.html?desktopSession=test-session-123');

    h.login.cancelDesktopSession();
});

test('Web browser with inbound desktopSession completes session via API on Google callback', async () => {
    const h = createHarness({ isTauri: false, desktopSessionParam: 'desk-session-abc' });
    h.context.window.__TAURI__ = null;

    await h.context.window.initGoogleIdentity;
    await h.login.handleGoogleLoginResponse({ credential: 'google-id-token-xyz' });

    const completeCall = h.calls.find(c => c[0] === 'Api.post' && c[1] === '/api/auth/desktop-session/complete');
    assert.ok(completeCall, 'Must post to complete desktop session');
    assert.equal(completeCall[2].sessionId, 'desk-session-abc');
    assert.equal(completeCall[2].idToken, 'google-id-token-xyz');

    const emitted = h.getEmitted();
    assert.ok(emitted, 'Must emit login-success');
    assert.equal(emitted.event, 'login-success');
    assert.equal(emitted.data.accessToken, 'token-desktop-success');
});
