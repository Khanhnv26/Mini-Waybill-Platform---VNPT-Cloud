const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { fakeClock } = require('./helpers/fake-clock.cjs');
const source = fs.readFileSync(require.resolve('../js/components/preloader.js'), 'utf8');

function harness({ delayedHost = false } = {}) {
    const clock = fakeClock(), listeners = new Map();
    const host = { hidden: true, innerHTML: '', replaceChildren() { this.innerHTML = ''; } };
    const nodes = new Map([['waybill-preloader', host], ['route-progress-fill', { style: {} }]]);
    for (let i = 1; i <= 4; i++) {
        for (const part of ['circle', 'icon', 'label']) nodes.set(`node-${part}-${i}`, { className: '', innerHTML: '', innerText: '' });
    }
    let available = !delayedHost;
    const document = {
        readyState: 'loading', getElementById: id => available ? nodes.get(id) || null : null,
        addEventListener: (name, fn) => listeners.set(name, fn),
        removeEventListener: name => listeners.delete(name)
    };
    const window = {};
    vm.runInNewContext(source, { document, window, ...clock });
    return { clock, host, nodes, window, mountHost() { available = true; listeners.get('DOMContentLoaded')?.(); } };
}

test('startup scene remains visible for 1.5 seconds when the app is ready early', async () => {
    const h = harness();
    assert.equal(h.host.hidden, false);
    assert.match(h.host.innerHTML, /WAYBILL POST/);
    h.window.WaybillPreloader.ready();
    await h.clock.advance(1499);
    assert.equal(h.host.hidden, false);
    h.window.WaybillPreloader.ready();
    await h.clock.advance(1);
    assert.equal(h.host.hidden, true);
    assert.equal(h.host.innerHTML, '');
    assert.equal(h.clock.pending, 0);
    h.window.WaybillPreloader.ready();
    assert.equal(h.host.hidden, true);
});

test('a slower app hides the scene immediately once ready after the minimum', async () => {
    const h = harness();
    await h.clock.advance(4200);
    assert.equal(h.host.hidden, false);
    h.window.WaybillPreloader.ready();
    assert.equal(h.host.hidden, true);
    assert.equal(h.clock.pending, 0);
});

test('failed startup releases the overlay at eight seconds', async () => {
    const h = harness();
    await h.clock.advance(7999);
    assert.equal(h.host.hidden, false);
    await h.clock.advance(1);
    assert.equal(h.host.hidden, true);
    assert.equal(h.clock.pending, 0);
});

test('ready before DOMContentLoaded never resurrects the overlay', () => {
    const h = harness({ delayedHost: true });
    h.window.WaybillPreloader.ready(); h.mountHost();
    assert.equal(h.host.hidden, true);
    assert.equal(h.host.innerHTML, '');
});

test('startup scene is mounted once even if its script is evaluated twice', () => {
    const h = harness();
    const first = h.host.innerHTML;
    vm.runInNewContext(source, { window: h.window });
    assert.equal(h.host.innerHTML, first);
    assert.equal(h.clock.pending, 4);
    h.window.WaybillPreloader.ready();
});

test('original milestones complete alongside the CSS fill by 1150 ms', async () => {
    const h = harness();
    assert.match(h.nodes.get('node-circle-1').className, /pulse-active/);
    await h.clock.advance(400);
    assert.match(h.nodes.get('node-icon-1').innerHTML, /<svg/);
    assert.match(h.nodes.get('node-circle-2').className, /pulse-active/);
    await h.clock.advance(400);
    assert.match(h.nodes.get('node-icon-2').innerHTML, /<svg/);
    assert.match(h.nodes.get('node-circle-3').className, /pulse-active/);
    await h.clock.advance(350);
    assert.match(h.host.innerHTML, /route-progress-animation/);
    for (let i = 1; i <= 4; i++) assert.match(h.nodes.get(`node-icon-${i}`).innerHTML, /<svg/);
    assert.equal(h.clock.pending, 1);
    h.window.WaybillPreloader.ready();
    await h.clock.advance(1000);
    assert.equal(h.clock.pending, 0);
});

test('startup scene retains its explicit truck and road animations', () => {
    const css = fs.readFileSync(require.resolve('../css/components/preloader.css'), 'utf8');
    assert.match(css, /\.animate-truck-body\s*\{\s*animation:\s*truckSuspension/);
    assert.match(css, /\.animate-road-dashes\s*\{\s*animation:\s*roadDashes/);
    assert.doesNotMatch(css, /animation:\s*none/);
});

test('login can show the same scene again and wait for dashboard data after mount', async () => {
    const h = harness();
    h.window.WaybillPreloader.ready(); await h.clock.advance(1500);
    assert.equal(h.host.hidden, true);
    const release = h.window.WaybillPreloader.show();
    assert.equal(h.host.hidden, false);
    let resolveData;
    h.window.WaybillPreloader.waitFor(new Promise(resolve => { resolveData = resolve; }));
    release(); await h.clock.advance(4000);
    assert.equal(h.host.hidden, false, 'mount alone must not dismiss pending dashboard data');
    resolveData();
    for (let i = 0; i < 10; i++) await Promise.resolve();
    assert.equal(h.host.hidden, true);
    assert.equal(h.clock.pending, 0);
});

test('failed dashboard data releases the scene without hiding its error state', async () => {
    const h = harness();
    let rejectData;
    h.window.WaybillPreloader.waitFor(new Promise((_, reject) => { rejectData = reject; }));
    h.window.WaybillPreloader.ready();
    rejectData(new Error('fixture: dashboard unavailable'));
    await h.clock.advance(1500);
    assert.equal(h.host.hidden, true);
});

test('stale login callbacks and old data cannot dismiss a newer loading cycle', async () => {
    const h = harness();
    const oldRelease = h.window.WaybillPreloader.show();
    let resolveOldData;
    h.window.WaybillPreloader.waitFor(new Promise(resolve => { resolveOldData = resolve; }));
    const release = h.window.WaybillPreloader.show();
    oldRelease(); resolveOldData(); await h.clock.advance(1500);
    assert.equal(h.host.hidden, false);
    release();
    assert.equal(h.host.hidden, true);
});

test('a stalled dashboard still releases the login overlay at eight seconds', async () => {
    const h = harness();
    h.window.WaybillPreloader.show();
    h.window.WaybillPreloader.waitFor(new Promise(() => {}));
    h.window.WaybillPreloader.ready();
    await h.clock.advance(8000);
    assert.equal(h.host.hidden, true);
    assert.equal(h.clock.pending, 0);
});

test('preloader avoids recurring JS progress updates and layout-based fill animation', () => {
    assert.doesNotMatch(source, /setInterval\s*\(/);
    assert.doesNotMatch(source, /progressFill\.style\.width/);
    const css = fs.readFileSync(require.resolve('../css/components/preloader.css'), 'utf8');
    assert.match(css, /@keyframes routeProgressFill/);
    assert.match(css, /transform: scaleX\(1\)/);
});

test('road animation travels one complete dash and gap each loop', () => {
    const css = fs.readFileSync(require.resolve('../css/components/preloader.css'), 'utf8');
    assert.match(source, /space-x-5 animate-road-dashes/);
    assert.match(source, /w-6 h-0\.5/);
    assert.match(css, /translateX\(-2\.75rem\)/);
});
