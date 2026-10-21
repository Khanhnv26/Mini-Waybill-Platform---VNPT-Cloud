const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

test('API initializes when Tauri defines its read-only isTauri global', () => {
    const window = { __TAURI__: {}, location: { protocol: 'http:', port: '', hostname: 'tauri.localhost' } };
    Object.defineProperty(window, 'isTauri', { value: true, writable: false, configurable: false });
    const context = vm.createContext({ window });
    // api.js runs as an ES module, so writes to read-only globals must throw.
    const source = fs.readFileSync(path.join(__dirname, '../js/api.js'), 'utf8');
    vm.runInContext('"use strict";\n' + source, context);
    assert.equal(window.isTauri, true);
    assert.equal(vm.runInContext('API_BASE_URL', context), 'https://waybill-express.japaneast.cloudapp.azure.com');
    assert.equal(typeof window.Api.request, 'function');
});
