const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const context = { window: {}, Vue: { reactive: value => value } };
vm.runInNewContext(fs.readFileSync(require.resolve('../js/utils.js'), 'utf8'), context);
const utils = context.window.Utils;

test('shipment status labels retain postal-location context and unknown values', () => {
    assert.equal(utils.formatStatusText('STORED', 'POST-HN-01'), 'Đã Lưu Bưu Cục');
    assert.equal(utils.formatStatusText('STORED', 'HUB-HN-01'), 'Đã Lưu Kho');
    assert.equal(utils.formatStatusText('ARRIVED_DEST_HUB', 'POST-HCM-01'), 'Đến Bưu Cục Phát');
    assert.equal(utils.formatStatusText('ARRIVED_DEST_HUB'), 'Đến Kho Đích');
    assert.equal(utils.formatStatusText('UNKNOWN'), 'UNKNOWN');
    assert.equal(utils.formatStatusText(null), '—');
    assert.equal(utils.getStatusIndicatorClass('__proto__'), 'status-indicator-slate');
});

test('badges expose explicit tones for every main shipment outcome', () => {
    for (const [status, tone] of Object.entries({ CREATED: 'slate', PENDING_ROUTING: 'slate',
        IN_TRANSIT: 'blue', OUT_FOR_DELIVERY: 'blue', DELIVERED: 'emerald',
        DELIVERY_FAILED: 'rose', RETURNING: 'amber', RETURNED: 'slate', CANCELLED: 'slate' })) {
        assert.equal(utils.getStatusIndicatorClass(status), `status-indicator-${tone}`);
        assert.equal(utils.formatStatusMeta(status).indicatorClass, `status-indicator-${tone}`);
    }
    assert.match(utils.getStatusBadgeClass('DELIVERED'), /bg-emerald-/);
    assert.match(utils.getStatusDotClass('DELIVERY_FAILED'), /bg-rose-/);
});

test('badge tone CSS is explicit in both themes and does not infer utility names', () => {
    const css = fs.readFileSync(require.resolve('../css/components/cards.css'), 'utf8');
    assert.doesNotMatch(css, /\[class\*=/);
    for (const tone of ['slate', 'blue', 'emerald', 'rose', 'amber', 'purple']) {
        assert.ok(css.includes(`.status-indicator-${tone}`));
        assert.ok(css.includes(`.dark .status-indicator-${tone}`));
    }
});
