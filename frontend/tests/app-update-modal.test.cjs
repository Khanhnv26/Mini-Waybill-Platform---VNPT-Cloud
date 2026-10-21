const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('AppUpdateModal component file exists and is registered in app.js and index.html', () => {
    const modalPath = path.resolve(__dirname, '../js/components/common/AppUpdateModal.js');
    assert.equal(fs.existsSync(modalPath), true, 'AppUpdateModal.js should exist');

    const appJsContent = fs.readFileSync(path.resolve(__dirname, '../js/app.js'), 'utf8');
    assert.match(appJsContent, /import\s+['"]\.\/components\/common\/AppUpdateModal\.js['"]/, 'app.js imports AppUpdateModal.js');
    assert.match(appJsContent, /app\.component\(['"]AppUpdateModal['"]/, 'app.js registers AppUpdateModal component');
    assert.match(appJsContent, /app\.component\(['"]app-update-modal['"]/, 'app.js registers app-update-modal component');
    assert.match(appJsContent, /const\s+appUpdateState\s*=\s*reactive\(/, 'app.js defines reactive appUpdateState');
    assert.match(appJsContent, /const\s+handleStartAppUpdate\s*=/, 'app.js defines handleStartAppUpdate handler');
    assert.match(appJsContent, /const\s+handleCloseAppUpdate\s*=/, 'app.js defines handleCloseAppUpdate handler');

    const indexHtmlContent = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
    assert.match(indexHtmlContent, /<app-update-modal/, 'index.html renders app-update-modal tag');
    assert.match(indexHtmlContent, /:show="appUpdateState\.show"/, 'index.html binds show prop');
    assert.match(indexHtmlContent, /@start-update="handleStartAppUpdate"/, 'index.html handles start-update event');
});

test('AppUpdateModal uses clean SVG icons and supports dark mode themes', () => {
    const modalContent = fs.readFileSync(path.resolve(__dirname, '../js/components/common/AppUpdateModal.js'), 'utf8');

    // Asserts SVG usage
    assert.match(modalContent, /<svg\s+class="w-6 h-6 text-white"/, 'includes main banner SVG icon');
    assert.match(modalContent, /<svg\s+class="w-6 h-6 animate-spin"/, 'includes progress spinner SVG');
    assert.match(modalContent, /<path[^>]*d="M13 10V3L4 14h7v7l9-11h-7z"/, 'includes lightning bolt SVG');
    assert.match(modalContent, /<path[^>]*d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/, 'includes parcel SVG');
    assert.match(modalContent, /<path[^>]*d="M9 12l2 2 4-4m5\.618-4\.016A11\.955 11\.955 0 0112 2\.944/, 'includes shield SVG');

    // Asserts dark mode theme classes
    assert.match(modalContent, /dark:bg-slate-900/, 'supports dark background on modal card');
    assert.match(modalContent, /dark:border-slate-800/, 'supports dark border on modal card');
    assert.match(modalContent, /dark:text-slate-100|dark:text-white/, 'supports dark text colors');
    assert.match(modalContent, /dark:bg-slate-800\/80/, 'supports dark background on version pill');
});

test('app.js parses dynamic changelog from GitHub Release notes and handles progress', () => {
    const appJsContent = fs.readFileSync(path.resolve(__dirname, '../js/app.js'), 'utf8');

    assert.match(appJsContent, /pendingTauriUpdate\.downloadAndInstall/, 'calls downloadAndInstall with progress callback');
    assert.match(appJsContent, /window\.__TAURI__\?\.process\?\.relaunch\(\)/, 'relaunches application after install');
    assert.match(appJsContent, /changelogLines\s*=\s*update\.body/, 'extracts dynamic changelog from update.body');
});
