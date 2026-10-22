const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const dist = path.join(root, 'dist');

// 1. Dọn dẹp thư mục dist cũ
if (fs.existsSync(dist)) {
    fs.rmSync(dist, { recursive: true, force: true });
}
fs.mkdirSync(dist, { recursive: true });

// 2. Copy các file HTML và favicon
const files = ['index.html', 'login.html', 'desktop-auth.html', 'error.html', 'mockup-loader.html', 'favicon.ico'];
files.forEach(f => {
    const srcPath = path.join(root, f);
    if (fs.existsSync(srcPath)) {
        fs.copyFileSync(srcPath, path.join(dist, f));
    }
});

// 3. Copy các thư mục tài nguyên: css, js, images
const folders = ['css', 'js', 'images'];
folders.forEach(dir => {
    const srcDir = path.join(root, dir);
    if (fs.existsSync(srcDir)) {
        fs.cpSync(srcDir, path.join(dist, dir), { recursive: true });
    }
});

console.log('[Tauri Build] Đã tách riêng web assets vào thư mục dist/ thành công!');
