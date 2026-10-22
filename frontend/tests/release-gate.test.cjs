const { test } = require('node:test');
const assert = require('node:assert/strict');
const { canRelease } = require('../../.github/scripts/check-release.cjs');

test('failed, cancelled or incomplete builds cannot advance GitOps image tags', () => {
    for (const result of ['failure', 'cancelled', undefined, '']) {
        assert.equal(canRelease({ event: 'workflow_dispatch', promote: true, validation: 'success', backend: result, frontend: 'success' }), false);
        assert.equal(canRelease({ event: 'workflow_dispatch', promote: true, validation: 'success', backend: 'success', frontend: result }), false);
        assert.equal(canRelease({ event: 'workflow_dispatch', promote: true, validation: result, backend: 'success', frontend: 'success' }), false);
        assert.equal(canRelease({ event: 'push', validation: 'success', backend: result, frontend: 'success' }), false);
    }
});

test('a validated release can contain one or both image groups on push or promote', () => {
    for (const [backend, frontend] of [['success', 'success'], ['success', 'skipped'], ['skipped', 'success']]) {
        assert.equal(canRelease({ event: 'workflow_dispatch', promote: true, validation: 'success', backend, frontend }), true);
        assert.equal(canRelease({ event: 'push', validation: 'success', backend, frontend }), true);
        assert.equal(canRelease({ event: 'pull_request', validation: 'success', backend, frontend }), false);
    }
    assert.equal(canRelease({ event: 'workflow_dispatch', promote: true, validation: 'success', backend: 'skipped', frontend: 'skipped' }), false);
    assert.equal(canRelease({ event: 'workflow_dispatch', promote: false, validation: 'success', backend: 'success', frontend: 'success' }), false);
    assert.equal(canRelease({ event: 'push', validation: 'success', backend: 'skipped', frontend: 'skipped' }), false);
});
