const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function harness() {
    const context = { window: {} };
    const source = fs.readFileSync(require.resolve('../js/viewLoader.js'), 'utf8').replace('export function', 'function');
    vm.runInNewContext(source + '\nglobalThis.create = createViewLoader;', context);
    return context;
}

test('views defer requests, share concurrent loads and wait for subcomponents', async () => {
    const h = harness();
    const calls = [];
    let resolveDependency;
    const dependency = new Promise(resolve => { resolveDependency = resolve; });
    const view = { template: '<div>fixture</div>' };
    const load = h.create('FixtureView', async () => { calls.push('view'); h.window.FixtureView = view; },
        [() => { calls.push('dependency'); return dependency; }]);
    assert.deepEqual(calls, []);
    const first = load(), second = load();
    assert.equal(first, second);
    assert.deepEqual(calls, ['dependency']);
    resolveDependency();
    assert.equal(await first, view);
    assert.equal(await load(), view);
    assert.deepEqual(calls, ['dependency', 'view']);
});

test('a failed module load can be retried instead of caching a rejection', async () => {
    const h = harness(); let attempt = 0;
    const load = h.create('FixtureView', async () => {
        if (++attempt === 1) throw new Error('fixture network failure');
        h.window.FixtureView = { template: '<div>ready</div>' };
    });
    await assert.rejects(load(), /network failure/);
    assert.ok(await load());
    assert.equal(attempt, 2);
});

test('app.js avoids loadingComponent in defineAsyncComponent inside Transition+KeepAlive and versions view imports', () => {
    const appSource = fs.readFileSync(require.resolve('../js/app.js'), 'utf8');
    const asyncBlockStart = appSource.indexOf('const viewLoaders = {');
    assert.ok(asyncBlockStart !== -1, 'app.js defines viewLoaders');
    const asyncBlock = appSource.slice(asyncBlockStart);
    assert.doesNotMatch(
        asyncBlock,
        /defineAsyncComponent\s*\(\s*\{[^}]*loadingComponent/,
        'defineAsyncComponent must not mount a loadingComponent element inside Transition+KeepAlive'
    );
    const dynamicImports = [...asyncBlock.matchAll(/import\(['"]([^'"]+)['"]\)/g)].map(m => m[1]);
    assert.ok(dynamicImports.length >= 22, 'all lazy views and subcomponents are dynamically imported');
    for (const spec of dynamicImports) {
        assert.match(spec, /\?v=/, `dynamic import ${spec} should include version query for immutable caching`);
    }
});

