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
