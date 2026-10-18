const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { fakeClock } = require('./helpers/fake-clock.cjs');

function harness({ reducedMotion = false, component = 'PublicHeader' } = {}) {
    const clock = fakeClock(), classes = new Set(), events = [], mutations = [];
    const mounts = [], unmounts = [], images = [];
    let update, resolveReady, resolveFinished;
    const storage = new Map();
    const context = {
        ...clock, reactive: value => value,
        localStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) },
        navigator: {}, CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } },
        window: { innerWidth: 1200, innerHeight: 800, matchMedia: query => ({ matches: query.includes('reduced-motion') && reducedMotion }),
            Image: class { constructor() { images.push(this); } decode() { this.decoded = true; return Promise.resolve(); } },
            dispatchEvent: event => events.push(event), addEventListener() {}, removeEventListener() {} },
        document: { documentElement: { classList: { contains: name => classes.has(name),
            add(name) { classes.add(name); mutations.push(name); }, remove: name => classes.delete(name) }, animate() {} },
            startViewTransition(callback) {
                update = callback;
                return { ready: new Promise(resolve => { resolveReady = resolve; }), finished: new Promise(resolve => { resolveFinished = resolve; }) };
            }
        },
        Vue: { ref: value => ({ value }), computed: fn => ({ get value() { return fn(); } }),
            reactive: value => value, nextTick: fn => Promise.resolve().then(fn),
            watch() {}, onMounted: fn => mounts.push(fn), onUnmounted: fn => unmounts.push(fn), onBeforeUnmount() {} }
    };
    let source = fs.readFileSync(require.resolve('../js/store/appStore.js'), 'utf8');
    source = source.replace(/import .*?;\s*/, '').replace('export const appStore', 'const appStore');
    vm.runInNewContext(source + '\nglobalThis.store = appStore;', context);
    context.appStore = context.window.appStore = context.store;
    const appSource = fs.readFileSync(require.resolve('../js/app.js'), 'utf8');
    const start = appSource.indexOf('            const toggleDarkMode =');
    const end = appSource.indexOf('            const showError =', start);
    context.isDarkMode = { value: false };
    vm.runInNewContext(appSource.slice(start, end) + '\nglobalThis.rootToggle = toggleDarkMode;', context);
    const file = component === 'LoginView' ? '../js/views/LoginView.js' : `../js/components/layout/${component}.js`;
    vm.runInNewContext(fs.readFileSync(require.resolve(file), 'utf8'), context);
    const header = context.window[component].setup({ isDarkMode: false }, { emit: (name, mode, origin) => {
        if (name === 'toggle-dark-mode') context.rootToggle(mode, origin);
    } });
    return { context, header, classes, events, mutations, mounts, unmounts, images,
        async captureTransition() { update(); resolveReady(); await Promise.resolve(); resolveFinished(); await Promise.resolve(); } };
}

for (const component of ['PublicHeader', 'AppTopbar', 'LoginView']) {
test(`${component} applies one theme update inside the View Transition snapshot`, async () => {
    const h = harness({ component });
    h.header.onKeyDown({ key: 'ArrowRight', preventDefault() {} });
    assert.equal(h.classes.has('dark'), false, 'a duplicate store call must not apply the theme before snapshot');
    await h.captureTransition();
    assert.equal(h.classes.has('dark'), true);
    assert.equal(h.mutations.filter(name => name === 'dark').length, 1);
    assert.equal(h.events.filter(event => event.type === 'theme-changed').length, 1);
});

test(`${component} changes reduced-motion themes immediately with one event`, () => {
    const h = harness({ reducedMotion: true, component });
    h.header.onKeyDown({ key: 'ArrowRight', preventDefault() {} });
    assert.equal(h.classes.has('dark'), true);
    assert.equal(h.events.filter(event => event.type === 'theme-changed').length, 1);
});
}

test('login prepares both background images without delaying mount and cleans up safely', () => {
    const h = harness({ component: 'LoginView' });
    assert.equal(h.images.length, 0);
    for (const mount of h.mounts) mount();
    assert.deepEqual(h.images.map(image => image.src), ['/images/my-bg.jpg', '/images/login-dark-bg.jpg?v=2']);
    assert.ok(h.images.every(image => image.decoded && image.fetchPriority === 'low'));
    for (const unmount of h.unmounts) unmount();
});
