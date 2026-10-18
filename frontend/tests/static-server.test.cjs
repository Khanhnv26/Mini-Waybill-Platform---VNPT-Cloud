const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const { gunzipSync } = require('node:zlib');
const { createServer } = require('../server.js');

test('HTTP assets cache by version, revalidate bare imports and negotiate gzip', async t => {
    const server = createServer();
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    t.after(() => new Promise(resolve => server.close(resolve)));
    const request = (path, headers = {}, method = 'GET') => new Promise((resolve, reject) => {
        const req = http.request({ hostname: '127.0.0.1', port: server.address().port, path, headers, method }, res => {
            const chunks = [];
            res.on('data', data => chunks.push(data));
            res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
        });
        req.on('error', reject); req.end();
    });
    const asset = await request('/js/app.js?v=ci', { 'Accept-Encoding': 'gzip' });
    assert.equal(asset.status, 200);
    assert.match(asset.headers['cache-control'], /immutable/);
    assert.equal(asset.headers['content-encoding'], 'gzip');
    const original = fs.readFileSync(require.resolve('../js/app.js'));
    assert.deepEqual(gunzipSync(asset.body), original);
    assert.ok(asset.body.length < original.length);
    const bare = await request('/js/app.js');
    assert.match(bare.headers['cache-control'], /max-age=0, must-revalidate/);
    const unchanged = await request('/js/app.js', { 'If-None-Match': bare.headers.etag });
    assert.equal(unchanged.status, 304);
    assert.equal(unchanged.body.length, 0);
    const noGzip = await request('/js/app.js', { 'Accept-Encoding': 'gzip;q=0' });
    assert.equal(noGzip.headers['content-encoding'], undefined);
    assert.deepEqual(noGzip.body, original);
    const head = await request('/js/app.js', {}, 'HEAD');
    assert.equal(head.body.length, 0);
    const html = await request('/');
    const route = await request('/login', { 'Accept-Encoding': 'gzip' });
    assert.match(html.headers['cache-control'], /no-store/);
    assert.match(route.headers['cache-control'], /no-store/);
    assert.equal(route.status, 200);
    assert.equal(route.headers['content-encoding'], 'gzip');
    assert.deepEqual(gunzipSync(route.body), html.body);
});
