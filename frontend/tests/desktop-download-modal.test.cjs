const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('DesktopDownloadModal component file exists and is registered in app.js and index.html', () => {
    const modalPath = path.resolve(__dirname, '../js/components/common/DesktopDownloadModal.js');
    assert.equal(fs.existsSync(modalPath), true, 'DesktopDownloadModal.js should exist');

    const appJsContent = fs.readFileSync(path.resolve(__dirname, '../js/app.js'), 'utf8');
    assert.match(appJsContent, /import\s+['"]\.\/components\/common\/DesktopDownloadModal\.js/, 'app.js imports DesktopDownloadModal.js');
    assert.match(appJsContent, /app\.component\(['"]DesktopDownloadModal['"]/, 'app.js registers DesktopDownloadModal component');
    assert.match(appJsContent, /app\.component\(['"]desktop-download-modal['"]/, 'app.js registers desktop-download-modal component');
    assert.match(appJsContent, /const\s+showDesktopDownloadModal\s*=\s*ref\(/, 'app.js defines showDesktopDownloadModal ref');
    assert.match(appJsContent, /const\s+openDesktopDownloadModal\s*=/, 'app.js defines openDesktopDownloadModal handler');
    assert.match(appJsContent, /const\s+closeDesktopDownloadModal\s*=/, 'app.js defines closeDesktopDownloadModal handler');

    const indexHtmlContent = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
    assert.match(indexHtmlContent, /<desktop-download-modal/, 'index.html renders desktop-download-modal tag');
    assert.match(indexHtmlContent, /:show="showDesktopDownloadModal"/, 'index.html binds show prop');
    assert.match(indexHtmlContent, /@close="closeDesktopDownloadModal"/, 'index.html handles close event');
});

test('PublicFooter includes Desktop App download button and hides when inside Tauri', () => {
    const footerContent = fs.readFileSync(path.resolve(__dirname, '../js/components/layout/PublicFooter.js'), 'utf8');

    assert.match(footerContent, /v-if="!isDesktopApp"/, 'hides button when inside desktop app');
    assert.match(footerContent, /handleOpenDownload/, 'defines click handler to open download modal');
    assert.match(footerContent, /T\u1EA3i Waybill Desktop/, 'displays download button title');
    assert.match(footerContent, /H\u1ED7 tr\u1EE3 Windows 10, 11 \(64-bit\)/, 'displays OS compatibility');
});

test('DesktopDownloadModal uses clean SVG icons and supports dark mode themes', () => {
    const modalContent = fs.readFileSync(path.resolve(__dirname, '../js/components/common/DesktopDownloadModal.js'), 'utf8');

    assert.match(modalContent, /<svg class="w-full h-full text-white" viewBox="0 0 32 32"/, 'includes 3D globe logo SVG');
    assert.match(modalContent, /<path[^>]*d="M13 10V3L4 14h7v7l9-11h-7z"/, 'includes lightning bolt SVG');
    assert.match(modalContent, /<path[^>]*d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7\.743 5\.743L11 17H9v2H7v2H4/, 'includes key SSO SVG');
    assert.match(modalContent, /<path[^>]*d="M15 17h5l-1\.405-1\.405/, 'includes system tray bell SVG');

    assert.match(modalContent, /dark:bg-slate-900/, 'supports dark background on modal card');
    assert.match(modalContent, /dark:border-slate-800/, 'supports dark border on modal card');
    assert.match(modalContent, /dark:text-white/, 'supports dark text colors');
});
