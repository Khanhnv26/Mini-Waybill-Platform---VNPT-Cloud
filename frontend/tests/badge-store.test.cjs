const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function createBadgeStoreContext() {
    const context = {
        window: {
            SupportChatRuntime: {
                state: {
                    unread: {}
                }
            }
        },
        document: {
            visibilityState: 'visible',
            addEventListener: () => {}
        },
        clearInterval,
        setInterval,
        Vue: {
            reactive: val => val,
            computed: fn => ({ get value() { return fn(); } })
        }
    };
    context.window.window = context.window;
    context.window.document = context.document;
    return context;
}

test('badgeStore returns correct badge structure and semantic colors', async () => {
    // Read the badgeStore module code and adapt it for CJS testing or evaluate it
    const fileContent = fs.readFileSync(require.resolve('../js/store/badgeStore.js'), 'utf8');
    // Transform ES module export/import for node VM
    const code = fileContent
        .replace("import { reactive, computed } from 'vue';", "const { reactive, computed } = Vue;")
        .replace("export const badgeStore =", "const badgeStore =")
        + "\ncontext.window.badgeStore = badgeStore;";

    const context = createBadgeStoreContext();
    context.context = context;
    vm.runInNewContext(code, context);

    const store = context.window.badgeStore;
    assert.ok(store);

    // Initial state: all counts 0 -> badges are null
    assert.equal(store.getBadge('support'), null);
    assert.equal(store.getBadge('payments'), null);
    assert.equal(store.getBadge('shipment'), null);
    assert.equal(store.getBadge('shipper'), null);

    // Support badge with unread messages
    context.window.SupportChatRuntime.state.unread = { 'ticket-1': 3, 'ticket-2': 2 };
    const supportBadge = store.getBadge('support');
    assert.ok(supportBadge);
    assert.equal(supportBadge.count, 5);
    assert.equal(supportBadge.colorClass, 'bg-blue-600');
    assert.match(supportBadge.title, /tin nhắn/);

    // Payments badge (amber)
    store.state.payments = 8;
    const paymentBadge = store.getBadge('payments');
    assert.ok(paymentBadge);
    assert.equal(paymentBadge.count, 8);
    assert.equal(paymentBadge.colorClass, 'bg-amber-500');

    // Shipment issues badge (rose)
    store.state.shipment = 4;
    const shipmentBadge = store.getBadge('shipment');
    assert.ok(shipmentBadge);
    assert.equal(shipmentBadge.count, 4);
    assert.equal(shipmentBadge.colorClass, 'bg-rose-500');

    // Shipper delivery tasks badge (blue)
    store.state.shipper = 12;
    const shipperBadge = store.getBadge('shipper');
    assert.ok(shipperBadge);
    assert.equal(shipperBadge.count, 12);
    assert.equal(shipperBadge.colorClass, 'bg-blue-600');

    // Stop polling cleans up gracefully
    store.stopPolling();
});
