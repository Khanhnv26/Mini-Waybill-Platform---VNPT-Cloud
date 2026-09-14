/**
 * Kiểm tra tĩnh: hàm được định nghĩa trong setup() và gọi từ template
 * nhưng quên export trong `return { ... }` (nguyên nhân lỗi
 * "X is not a function" khi render).
 *
 * Chạy: node scratch/check_view_exports.js
 * Thoát mã 1 nếu phát hiện hàm bị thiếu export.
 */
const fs = require('fs');
const path = require('path');

const VIEWS_DIR = path.join(__dirname, '..', 'frontend', 'js', 'views');
const VIEW_FILES = [
    'PostOfficeOpsView.js',
    'HubOpsView.js',
    'ShipperView.js',
    'TripsView.js',
    'TrackingView.js'
];

function collectDefinedFunctions(source) {
    const names = new Set();
    const patterns = [
        /const\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\(/g,
        /const\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?function/g
    ];
    for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(source))) names.add(match[1]);
    }
    return names;
}

function collectExportedNames(source, templateIndex) {
    const returnIndex = source.lastIndexOf('return {', templateIndex);
    if (returnIndex < 0) return new Set();
    const endIndex = source.indexOf('};', returnIndex);
    const block = source.slice(returnIndex + 'return {'.length, endIndex);
    return new Set(block
        .split(',')
        .map(entry => entry.trim().split(':')[0].trim())
        .filter(name => /^[A-Za-z_$][\w$]*$/.test(name)));
}

function collectTemplateCalls(template) {
    const names = new Set();
    const pattern = /(?:^|[^\w$.])([A-Za-z_$][\w$]*)\s*\(/g;
    let match;
    while ((match = pattern.exec(template))) names.add(match[1]);
    return names;
}

let failures = 0;
for (const file of VIEW_FILES) {
    const source = fs.readFileSync(path.join(VIEWS_DIR, file), 'utf8');
    const templateIndex = source.indexOf('template: `');
    if (templateIndex < 0) {
        console.log('SKIP | ' + file + ' không có template inline');
        continue;
    }
    const template = source.slice(templateIndex);
    const defined = collectDefinedFunctions(source.slice(0, templateIndex));
    const exported = collectExportedNames(source, templateIndex);
    const calls = collectTemplateCalls(template);
    const missing = [...calls].filter(name => defined.has(name) && !exported.has(name));

    if (missing.length === 0) {
        console.log('PASS | ' + file + ': mọi hàm dùng trong template đều đã export');
    } else {
        failures += missing.length;
        console.log('FAIL | ' + file + ': thiếu export -> ' + missing.join(', '));
    }
}

process.exit(failures === 0 ? 0 : 1);
