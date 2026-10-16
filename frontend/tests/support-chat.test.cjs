const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function harness() {
    const storage = new Map();
    const calls = [];
    const clients = [];
    const timers = new Map();
    let timerId = 0;
    const context = {
        window: {},
        sessionStorage: { setItem: (k,v) => storage.set(k,v), getItem: k => storage.get(k) || null },
        Api: {
            get: async (url, headers) => { calls.push({ url, headers }); return { ok: true, json: async () => ({ id: 7, ticketCode: 'TKT-7' }) }; },
            post: async (url, body, headers) => { calls.push({ url, headers }); return { ok: true, json: async () => ({ id: 7, ticketCode: 'TKT-7', accessToken: 'guest-secret' }) }; }
        },
        Auth: { getToken: () => 'signed-jwt' },
        SockJS: function () { this.close = () => {}; },
        Stomp: { over: () => {
            const client = {
                connected: false, heartbeat: {}, subscriptions: [],
                connect(headers, success, failure) { this.headers = headers; this.success = success; this.failure = failure; },
                subscribe(topic, callback, headers) { this.subscriptions.push({topic, headers}); return { unsubscribe() {} }; },
                disconnect() { this.connected = false; }
            };
            clients.push(client); return client;
        } },
        setTimeout: fn => { timers.set(++timerId, fn); return timerId; },
        clearTimeout: id => timers.delete(id)
    };
    vm.runInNewContext(fs.readFileSync(require.resolve('../js/services/supportService.js'), 'utf8'), context);
    return { ...context.window, clients, timers, calls };
}

test('guest ticket creation retains its capability for subsequent reads and messages', async () => {
    const h = harness();
    await h.SupportService.createTicket({});
    await h.SupportService.getTicketByCode('TKT-7');
    await h.SupportService.addMessage(7, { content: 'hello' });
    assert.equal(h.calls[1].headers['X-Ticket-Access-Token'], 'guest-secret');
    assert.equal(h.calls[2].headers['X-Ticket-Access-Token'], 'guest-secret');
    assert.equal(h.SupportService.getTicketAccess(8), null);
});

test('reconnect subscribes to the currently selected ticket and stopping cancels retries', () => {
    const h = harness();
    h.SupportService.rememberTicketAccess({id: 7, ticketCode: 'TKT-7', accessToken: 'guest-secret'});
    const connection = new h.SupportChatConnection({url: '/ws', onConnect() {}, onDisconnect() {}, onMessage() {}});
    connection.subscribe({id: 7}); connection.start();
    const first = h.clients[0];
    assert.equal(first.headers.Authorization, 'Bearer signed-jwt');
    first.connected = true; first.success();
    assert.equal(first.subscriptions[0].topic, '/topic/tickets/7');
    assert.equal(first.subscriptions[0].headers['X-Ticket-Access-Token'], 'guest-secret');
    first.failure();
    connection.subscribe({id: 8});
    const retry = h.timers.values().next().value; h.timers.clear(); retry();
    const second = h.clients[1]; second.connected = true; second.success();
    assert.equal(second.subscriptions[0].topic, '/topic/tickets/8');
    second.failure();
    connection.stop();
    assert.equal(h.timers.size, 0);
});
