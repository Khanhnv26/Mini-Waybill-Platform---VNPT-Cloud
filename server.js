const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

const server = http.createServer((req, res) => {
    const filePath = path.join(__dirname, 'frontend', 'index.html');
    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('Lỗi đọc file: ' + err.message);
            return;
        }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(data);
    });
});

server.listen(PORT, () => {
    console.log('\n======================================================');
    console.log(' 🚚 FRONTEND SERVER ĐANG CHẠY TẠI: http://localhost:' + PORT);
    console.log(' Mở trình duyệt và truy cập: http://localhost:' + PORT);
    console.log('======================================================\n');
});
