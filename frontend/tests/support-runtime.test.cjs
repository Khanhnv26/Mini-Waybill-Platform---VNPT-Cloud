const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { fakeClock } = require('./helpers/fake-clock.cjs');

function storage() {
    const data = new Map();
    return { get length() { return data.size; }, key: i => [...data.keys()][i],
        getItem: key => data.get(key) || null, setItem: (key, value) => data.set(key, String(value)), removeItem: key => data.delete(key) };
}
function events() {
    const handlers = new Map();
    return { addEventListener(name, fn) { if (!handlers.has(name)) handlers.set(name, new Set()); handlers.get(name).add(fn); },
        removeEventListener(name, fn) { handlers.get(name)?.delete(fn); },
        dispatchEvent(event) { for (const fn of handlers.get(event.type) || []) fn(event); } };
}
const flush = async () => { for (let i = 0; i < 15; i++) await Promise.resolve(); };
function harness({ shared = storage(), guest = false, guestTicket = true, clock = null } = {}) {
    const connections = [], toasts = [], sounds = [], calls = [], timeouts = new Map();
    let notices = [], count = 0, authenticated = !guest, token = 'jwt';
    let send = async () => ({ id: 1, content: 'hello' });
    let request = null;
    const session = storage();
    if (guest && guestTicket) session.setItem('support_access:7', 'secret-7');
    const document = { ...events(), hidden: false };
    const window = { ...events(), location: { protocol: 'http:', hostname: 'localhost', port: '3000' },
        Auth: { getToken: () => authenticated ? token : null,
            decodeJwtPayload: () => authenticated ? { userId: 12, roles: ['ROLE_CUSTOMER'] } : null },
        Utils: { showToast: (...args) => toasts.push(args) },
        AudioContext: class { constructor() { this.state = 'running'; this.currentTime = 0; this.destination = {}; }
            resume() { return Promise.resolve(); } close() { return Promise.resolve(); }
            createOscillator() { return { connect() {}, frequency: { setValueAtTime() {} }, start() { sounds.push(1); }, stop() {} }; }
            createGain() { return { connect() {}, gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} } }; } },
        SupportService: {
            ticketHeaders: id => ({ 'X-Ticket-Access-Token': session.getItem(`support_access:${id}`) }),
            async chatRequest(url, method, payload, id) {
                calls.push({ url, method, payload, id });
                if (request) return request(url);
                if (url.includes('/inbox')) return notices.map(item => ({ ...item }));
                if (url.includes('/summary')) return [];
                return null;
            },
            addMessage: (...args) => send(...args),
            async markRead(ticketId, id, only) { calls.push({ ticketId, id, only }); return { unreadCount: 0 }; }
        },
        SupportChatConnection: class {
            constructor(options) { this.options = options; connections.push(this); }
            subscribe(ticket) { this.ticket = ticket; }
            subscribeInboxes(inboxes) { this.inboxes = inboxes; }
            start() {} stop() { this.stopped = true; }
        }
    };
    const context = { window, document, sessionStorage: session, localStorage: shared,
        navigator: { locks: { request: async (name, fn) => fn() } },
        CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options?.detail; } },
        setInterval() { return 1; }, clearInterval() {},
        setTimeout(fn) { timeouts.set(++count, fn); return count; }, clearTimeout(id) { timeouts.delete(id); },
        ...(clock || {}) };
    vm.runInNewContext(fs.readFileSync(require.resolve('../js/services/supportChatRuntime.js'), 'utf8'), context);
    window.SupportChatRuntime.start();
    const incoming = event => connections.at(-1).options.onMessage({ body: JSON.stringify(event) });
    return { window, document, runtime: window.SupportChatRuntime, connections, toasts, sounds, calls, timeouts, incoming,
        setNotices(value) { notices = value; }, setSend(fn) { send = fn; },
        setRequest(fn) { request = fn; },
        login() { authenticated = true; window.dispatchEvent({ type: 'auth:changed' }); },
        grantGuestTicket() { session.setItem('support_access:7', 'secret-7'); window.dispatchEvent({ type: 'support:access-changed' }); },
        logout() { authenticated = false; window.dispatchEvent({ type: 'auth:changed' }); },
        refreshToken() { token = 'jwt-refreshed'; window.dispatchEvent({ type: 'auth:changed' }); },
        event: { eventType: 'MESSAGE', ticketId: 7, ticketCode: 'TKT-7', messageId: 91, senderId: 42,
            senderRole: 'ROLE_CS', audienceKey: 'user:12', senderName: 'CSKH', content: 'Xin chào' } };
}

test('receives notices while another page is open and preserves read state on duplicate events', async () => {
    const h = harness(); await flush();
    h.document.dispatchEvent({ type: 'pointerdown' });
    h.incoming(h.event); h.incoming(h.event); await flush();
    assert.equal(h.runtime.state.notices.length, 1);
    assert.equal(h.toasts.length, 1); assert.equal(h.sounds.length, 1);
    await h.runtime.dismiss(h.runtime.state.notices[0]);
    h.incoming(h.event); await flush();
    assert.equal(h.runtime.state.notices[0].isRead, true);
    assert.equal(h.sounds.length, 1);
    h.runtime.stop();
});

test('the visible current conversation suppresses popup and sound; a hidden tab does not mark read', async () => {
    const h = harness(); await flush(); h.document.dispatchEvent({ type: 'pointerdown' });
    h.runtime.select({ id: 7 }, () => true); h.incoming(h.event); await flush();
    assert.equal(h.sounds.length, 0); assert.equal(h.toasts.length, 0);
    h.document.hidden = true;
    h.incoming({ ...h.event, messageId: 92 }); await flush();
    assert.equal(h.sounds.length, 1); assert.equal(h.toasts.length, 0);
    assert.equal(h.calls.filter(call => call.only === false).length, 0);
    h.runtime.stop();
});

test('two tabs share a single sound claim and the sound preference is remembered', async () => {
    const shared = storage(); const a = harness({ shared }), b = harness({ shared }); await flush();
    for (const h of [a, b]) h.document.dispatchEvent({ type: 'pointerdown' });
    a.incoming(a.event); b.incoming(b.event); await flush();
    assert.equal(a.sounds.length + b.sounds.length, 1);
    a.runtime.toggleSound();
    const c = harness({ shared });
    assert.equal(c.runtime.state.sound, false);
    a.runtime.stop(); b.runtime.stop(); c.runtime.stop();
});

test('failed sends retry with the same id and retain the original ticket when switching conversations', async () => {
    const h = harness(); await flush(); const sent = [], completions = [];
    h.window.addEventListener('support:sent', event => completions.push(event.detail));
    h.setSend(async (id, payload) => { sent.push({ id, payload }); if (sent.length === 1) throw new Error('offline'); return { id: 101, content: payload.content }; });
    h.runtime.select({ id: 7 }, () => false);
    h.runtime.send(7, { content: 'hello' }); await flush();
    const pending = h.runtime.state.pending[7][0];
    assert.equal(pending.status, 'failed');
    h.runtime.select({ id: 8 }, () => false);
    await h.runtime.retry(pending); await flush();
    assert.equal(sent[0].payload.clientMessageId, sent[1].payload.clientMessageId);
    assert.equal(sent[1].id, 7); assert.equal(completions[0].ticketId, 7);
    assert.equal(h.runtime.state.pending[7].length, 0);
    h.runtime.stop();
});

test('permanent access errors do not retry automatically; logout isolates pending messages and notices', async () => {
    const h = harness(); await flush();
    h.setSend(async () => { const error = new Error('Forbidden'); error.status = 403; throw error; });
    h.runtime.send(7, { content: 'hello' }); await flush();
    assert.equal(h.timeouts.size, 0);
    h.incoming(h.event); h.logout(); await flush();
    assert.equal(h.runtime.state.notices.length, 0);
    assert.equal(Object.keys(h.runtime.state.pending).length, 0);
    assert.equal(h.connections[0].stopped, true);
    h.runtime.stop();
});

test('guest inboxes and presence requests are scoped to known ticket capabilities', async () => {
    const h = harness({ guest: true }); await flush();
    assert.equal(h.connections[0].inboxes[0].destination, '/topic/chat/inbox/guest/7');
    assert.equal(h.connections[0].inboxes[0].headers['X-Ticket-Access-Token'], 'secret-7');
    assert.ok(h.calls.some(call => call.url === '/api/tickets/chat/inbox?ticketId=7' && call.id === 7));
    assert.ok(h.calls.some(call => call.payload?.ticketId === 7 && call.url.includes('/presence')));
    h.runtime.stop();
});

test('polling reconciles missed notices without replaying a notification twice', async () => {
    const h = harness(); await flush(); h.document.dispatchEvent({ type: 'pointerdown' });
    h.setNotices([{ ...h.event, id: 91, isRead: false }]);
    await h.runtime.refresh(); await h.runtime.refresh();
    assert.equal(h.runtime.state.notices.length, 1); assert.equal(h.sounds.length, 1);
    h.runtime.stop();
});

test('token refresh keeps drafts and pending sends for the same account', async () => {
    const h = harness(); await flush(); let resolve;
    h.setSend(() => new Promise(done => { resolve = done; }));
    h.runtime.drafts.set(7, { text: 'draft' });
    h.runtime.send(7, { content: 'hello' });
    h.refreshToken();
    assert.equal(h.runtime.drafts.get(7).text, 'draft');
    assert.equal(h.runtime.state.pending[7].length, 1);
    resolve({ id: 101, content: 'hello' }); await flush();
    assert.equal(h.runtime.state.pending[7].length, 0);
    h.runtime.stop();
});

test('a WebSocket acknowledgement resolves the pending send even if the HTTP response is lost', async () => {
    const h = harness(); await flush(); let reject;
    h.setSend(() => new Promise((done, fail) => { reject = fail; }));
    const clientMessageId = h.runtime.send(7, { content: 'hello' });
    h.incoming({ ...h.event, senderId: 12, senderRole: 'CUSTOMER', clientMessageId });
    reject(new Error('response lost')); await flush();
    assert.equal(h.runtime.state.pending[7].length, 0);
    assert.equal(h.timeouts.size, 0);
    h.runtime.stop();
});

test('an older inbox snapshot cannot undo a notification dismissal', async () => {
    const h = harness(); await flush();
    h.incoming(h.event);
    await h.runtime.dismiss(h.runtime.state.notices[0]);
    h.setNotices([{ ...h.event, id: h.event.messageId, isRead: false }]);
    await h.runtime.refresh();
    assert.equal(h.runtime.state.notices[0].isRead, true);
    h.runtime.stop();
});

test('hidden tabs issue at most five periodic requests per minute, connected or disconnected', async () => {
    for (const connected of [true, false]) {
        const clock = fakeClock(), h = harness({ clock });
        h.document.hidden = true;
        if (connected) h.connections.at(-1).options.onConnect();
        await clock.advance(0); await flush(); h.calls.length = 0;
        await clock.advance(60000);
        const inbox = h.calls.filter(call => call.url?.includes('/inbox'));
        const beats = h.calls.filter(call => call.url?.includes('/presence'));
        assert.equal(inbox.length, 1);
        assert.equal(beats.length, 2);
        assert.ok(h.calls.length <= 5, `${connected}: ${h.calls.length} requests`);
        h.runtime.stop();
    }
});

test('visible polling follows WebSocket state and stops all timers on teardown', async () => {
    const clock = fakeClock(), h = harness({ clock });
    await flush(); h.calls.length = 0;
    await clock.advance(5000);
    assert.equal(h.calls.filter(call => call.url?.includes('/inbox')).length, 1);
    h.connections.at(-1).options.onConnect(); await clock.advance(0);
    h.calls.length = 0;
    await clock.advance(14999);
    assert.equal(h.calls.filter(call => call.url?.includes('/inbox')).length, 0);
    await clock.advance(1);
    assert.equal(h.calls.filter(call => call.url?.includes('/inbox')).length, 1);
    h.runtime.stop(); await flush();
    assert.equal(clock.pending, 0);
    const count = h.calls.length;
    await clock.advance(60000);
    h.window.dispatchEvent({ type: 'online' }); await clock.advance(0);
    assert.equal(h.calls.length, count);
});

test('wake events coalesce and slow inbox requests never overlap', async () => {
    const clock = fakeClock(), h = harness({ clock }); await flush();
    h.document.hidden = true; await clock.advance(1000); h.document.hidden = false;
    h.calls.length = 0;
    let release;
    h.setRequest(url => url.includes('/inbox') ? new Promise(resolve => { release = resolve; }) : []);
    h.document.dispatchEvent({ type: 'visibilitychange' }); h.window.dispatchEvent({ type: 'online' });
    await clock.advance(0);
    assert.equal(h.calls.filter(call => call.url?.includes('/inbox')).length, 1);
    await clock.advance(15000);
    assert.equal(h.calls.filter(call => call.url?.includes('/inbox')).length, 1);
    release([]); await flush();
    await clock.advance(5000);
    assert.equal(h.calls.filter(call => call.url?.includes('/inbox')).length, 2);
    release([]); await flush(); h.runtime.stop();
});

test('anonymous sessions stay idle until login or a guest capability is granted', async () => {
    for (const login of [true, false]) {
        const clock = fakeClock(), h = harness({ clock, guest: true, guestTicket: false });
        await clock.advance(60000);
        assert.equal(h.connections.length, 0); assert.equal(h.calls.length, 0); assert.equal(clock.pending, 0);
        if (login) h.login(); else h.grantGuestTicket();
        await flush();
        assert.equal(h.connections.length, 1);
        assert.ok(h.calls.some(call => call.url?.includes('/inbox')));
        if (login) { h.logout(); await flush(); assert.equal(clock.pending, 0); }
        h.runtime.stop();
    }
});

test('support templates compile after adding presence, read receipts and retry controls', () => {
    const { compile } = require('../node_modules/@vue/compiler-dom');
    const context = { window: {}, Vue: {} };
    vm.runInNewContext(fs.readFileSync(require.resolve('../js/views/SupportView.js'), 'utf8'), context);
    const errors = [];
    compile(context.window.SupportView.template, { onError: error => errors.push(error.message) });
    for (const [file, name] of [['../js/layouts/PublicLayout.js', 'PublicLayout'], ['../js/components/layout/AppSidebar.js', 'AppSidebar']]) {
        vm.runInNewContext(fs.readFileSync(require.resolve(file), 'utf8'), context);
        compile(context.window[name].template, { onError: error => errors.push(error.message) });
    }
    assert.deepEqual(errors, []);
});
