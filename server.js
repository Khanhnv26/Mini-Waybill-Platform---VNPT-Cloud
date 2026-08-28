const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const GATEWAY_HOST = '127.0.0.1';
const GATEWAY_PORT = 8080;

const server = http.createServer((req, res) => {
    // 1. If request is an API call -> Proxy directly to Spring Cloud Gateway :8080
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
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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

    // 2. Serve frontend index.html
    const filePath = path.join(__dirname, 'frontend', 'index.html');
    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('Lỗi nạp file index.html: ' + err.message);
            return;
        }
        res.writeHead(200, {
            'Content-Type': 'text/html; charset=utf-8',
            'Access-Control-Allow-Origin': '*'
        });
        res.end(data);
    });
});

server.listen(PORT, () => {
    console.log('\n=================================================================');
    console.log(' 🚚 VNPT WAYBILL FRONTEND SERVER ĐANG CHẠY TẠI: http://localhost:' + PORT);
    console.log(' 🔗 Tích hợp Reverse Proxy tự động chuyển tiếp /api sang Gateway :8080');
    console.log('=================================================================\n');
});
