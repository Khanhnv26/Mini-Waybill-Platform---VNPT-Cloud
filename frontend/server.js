const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const PORT = process.env.PORT || process.argv[2] || 3000;
const GATEWAY_HOST = process.env.GATEWAY_HOST || '127.0.0.1';
const GATEWAY_PORT = process.env.GATEWAY_PORT || 8080;
const FRONTEND_DIR = fs.existsSync(path.join(__dirname, 'index.html'))
    ? __dirname
    : (fs.existsSync(path.join(__dirname, 'frontend')) ? path.join(__dirname, 'frontend') : __dirname);
const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.webp': 'image/webp',
    '.avif': 'image/avif',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2'
};
function sendFile(req, res, filePath, stats) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const isHtml = ext === '.html';
    const versioned = new URL(req.url, 'http://localhost').searchParams.has('v');
    const etag = 'W/"' + stats.size.toString(16) + '-' + Math.trunc(stats.mtimeMs).toString(16) + '"';
    const headers = {
        'Content-Type': contentType,
        'Cache-Control': isHtml ? 'no-cache, no-store, must-revalidate'
            : versioned ? 'public, max-age=31536000, immutable' : 'public, max-age=0, must-revalidate',
        'ETag': etag,
        'Vary': 'Accept-Encoding',
        'X-Content-Type-Options': 'nosniff'
    };
    if (!isHtml && req.headers['if-none-match'] === etag) {
        res.writeHead(304, headers); res.end(); return;
    }
    const acceptsGzip = (req.headers['accept-encoding'] || '').split(',')
        .some(value => /^\s*gzip\s*(;|$)/i.test(value) && !/;\s*q=0(?:\.0*)?\s*$/i.test(value));
    const compress = stats.size >= 1024 && /^(text\/|application\/(javascript|json))/.test(contentType) && acceptsGzip;
    if (compress) headers['Content-Encoding'] = 'gzip';
    else headers['Content-Length'] = stats.size;
    res.writeHead(200, headers);
    if (req.method === 'HEAD') { res.end(); return; }
    const stream = fs.createReadStream(filePath);
    stream.on('error', () => res.destroy());
    if (compress) {
        const gzip = zlib.createGzip({ level: 4 });
        gzip.on('error', () => res.destroy());
        stream.pipe(gzip).pipe(res);
    } else stream.pipe(res);
    return;
}
function createServer() {
    return http.createServer((req, res) => {
        if (req.url.startsWith('/api/')) {
            const options = {
                hostname: GATEWAY_HOST,
                port: GATEWAY_PORT,
                path: req.url,
                method: req.method,
                headers: {
                    ...req.headers,
                    host: GATEWAY_HOST + ':' + GATEWAY_PORT
                }
            };
            const proxyReq = http.request(options, (proxyRes) => {
                res.writeHead(proxyRes.statusCode, {
                    ...proxyRes.headers,
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
                    'Access-Control-Allow-Headers': '*'
                });
                proxyRes.pipe(res, { end: true });
            });
            proxyReq.on('error', (err) => {
                res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ error: 'Gateway Connection Failed: ' + err.message }));
            });
            req.pipe(proxyReq, { end: true });
            return;
        }
        
        const [rawPath, queryString] = req.url.split('?');
        const query = queryString ? '?' + queryString : '';
        const lowerPath = rawPath.toLowerCase();
        if (lowerPath === '/login.html') {
            res.writeHead(301, { 'Location': '/login' + query });
            res.end();
            return;
        }
        if (lowerPath === '/index.html') {
            res.writeHead(301, { 'Location': '/' + query });
            res.end();
            return;
        }
        if (lowerPath === '/error.html') {
            res.writeHead(301, { 'Location': '/error' + query });
            res.end();
            return;
        }
        let urlPath = rawPath;
        if (urlPath === '/' || urlPath === '') {
            urlPath = '/index.html';
        }
        const safePath = path.normalize(urlPath).replace(/^(\.\.[\/\\])+/, '');
        let filePath = path.join(FRONTEND_DIR, safePath);
        fs.stat(filePath, (err, stats) => {
            if (err || !stats.isFile()) {
                
                const ext = path.extname(urlPath);
                if (!ext) {
                    const spaIndexPath = path.join(FRONTEND_DIR, 'index.html');
                    fs.stat(spaIndexPath, (indexError, indexStats) => {
                        if (indexError || !indexStats.isFile()) {
                            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
                            res.end('404 Not Found'); return;
                        }
                        sendFile(req, res, spaIndexPath, indexStats);
                    });
                    return;
                }
                
                res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end('404 Not Found: Không tìm thấy tệp yêu cầu ' + urlPath);
                return;
            }
            sendFile(req, res, filePath, stats);
        });
    });
}
function start() {
    const server = createServer();
    server.listen(PORT, () => {
    console.log(`WAYBILL FRONTEND SERVER ĐANG CHẠY TẠI: http://localhost:${PORT}`);
    console.log(`Proxy chuyển tiếp /api sang Spring Cloud Gateway: http://${GATEWAY_HOST}:${GATEWAY_PORT}`);
});
return server;
}
module.exports = { createServer, start };
if (require.main === module) start();
