const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const GATEWAY_HOST = '127.0.0.1';
const GATEWAY_PORT = 8080;
const FRONTEND_DIR = path.join(__dirname, 'frontend');

// Bảng MIME types hỗ trợ phục vụ các file tĩnh
const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
    // 1. Chuyển tiếp (Reverse Proxy) tất cả các cuộc gọi /api sang Spring Cloud Gateway :8080
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

    // 2. Phục vụ các file tĩnh trong thư mục frontend/ (index.html, login.html, js/auth.js, js/api.js...)
    let urlPath = req.url.split('?')[0];
    if (urlPath === '/' || urlPath === '') {
        urlPath = '/index.html';
    }

    // Chống tấn công Directory Traversal (../)
    const safePath = path.normalize(urlPath).replace(/^(\.\.[\/\\])+/, '');
    let filePath = path.join(FRONTEND_DIR, safePath);

    // Kiểm tra nếu đường dẫn không có đuôi file mà file .html tồn tại (vd: /login -> /login.html)
    if (!fs.existsSync(filePath) && fs.existsSync(filePath + '.html')) {
        filePath = filePath + '.html';
    }

    // Đọc và trả về file
    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('404 Not Found: Không tìm thấy tệp yêu cầu ' + urlPath);
            return;
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        res.writeHead(200, {
            'Content-Type': contentType,
            'Access-Control-Allow-Origin': '*'
        });

        fs.createReadStream(filePath).pipe(res);
    });
});

server.listen(PORT, () => {
    console.log('\n=================================================================');
    console.log(' 🚚 VNPT WAYBILL FRONTEND SERVER ĐANG CHẠY TẠI: http://localhost:' + PORT);
    console.log(' 🌐 Trang chính Dashboard: http://localhost:' + PORT + '/index.html');
    console.log(' 🔑 Trang Đăng nhập:      http://localhost:' + PORT + '/login.html');
    console.log(' 🔗 Reverse Proxy: Chuyển tiếp /api/** sang Gateway :8080');
    console.log('=================================================================\n');
});
