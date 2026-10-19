const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function stripJsComments(code) {
    let result = '';
    let state = 'NORMAL';
    const templateJsStack = [];

    function isRegex(index) {
        let i = index - 1;
        while (i >= 0 && /\s/.test(code[i])) i--;
        if (i < 0) return true;
        const lastChar = code[i];
        if (/[=(,[{:;!&|?~^%<>+\-*]/.test(lastChar)) return true;
        const before = code.slice(Math.max(0, i - 10), i + 1);
        if (/\b(return|case|typeof|void|yield|await|throw|delete)$/.test(before)) return true;
        return false;
    }

    let i = 0;
    const len = code.length;

    while (i < len) {
        const ch = code[i];
        const next = i + 1 < len ? code[i + 1] : '';

        if (state === 'NORMAL') {
            if (ch === '/' && next === '/') {
                state = 'LINE_COMMENT';
                i += 2;
                continue;
            } else if (ch === '/' && next === '*') {
                state = 'BLOCK_COMMENT';
                i += 2;
                continue;
            } else if (ch === "'") {
                state = 'SINGLE_QUOTE';
                result += ch;
                i++;
                continue;
            } else if (ch === '"') {
                state = 'DOUBLE_QUOTE';
                result += ch;
                i++;
                continue;
            } else if (ch === '`') {
                state = 'TEMPLATE';
                result += ch;
                i++;
                continue;
            } else if (ch === '/' && isRegex(i)) {
                state = 'REGEX';
                result += ch;
                i++;
                continue;
            } else {
                result += ch;
                i++;
                continue;
            }
        } else if (state === 'LINE_COMMENT') {
            if (ch === '\n' || ch === '\r') {
                state = 'NORMAL';
                result += ch;
            }
            i++;
            continue;
        } else if (state === 'BLOCK_COMMENT') {
            if (ch === '*' && next === '/') {
                state = 'NORMAL';
                i += 2;
                continue;
            }
            if (ch === '\n') result += '\n';
            i++;
            continue;
        } else if (state === 'SINGLE_QUOTE') {
            result += ch;
            if (ch === '\\') { result += next; i += 2; continue; }
            if (ch === "'") state = 'NORMAL';
            i++;
            continue;
        } else if (state === 'DOUBLE_QUOTE') {
            result += ch;
            if (ch === '\\') { result += next; i += 2; continue; }
            if (ch === '"') state = 'NORMAL';
            i++;
            continue;
        } else if (state === 'REGEX') {
            result += ch;
            if (ch === '\\') { result += next; i += 2; continue; }
            if (ch === '/') state = 'NORMAL';
            i++;
            continue;
        } else if (state === 'TEMPLATE') {
            if (ch === '<' && code.slice(i, i + 4) === '<!--') {
                const endComment = code.indexOf('-->', i + 4);
                if (endComment !== -1) {
                    i = endComment + 3;
                    continue;
                }
            }
            if (ch === '$' && next === '{') {
                result += '${';
                i += 2;
                templateJsStack.push(1);
                state = 'TEMPLATE_JS';
                continue;
            }
            result += ch;
            if (ch === '\\') { result += next; i += 2; continue; }
            if (ch === '`') state = 'NORMAL';
            i++;
            continue;
        } else if (state === 'TEMPLATE_JS') {
            if (ch === '/' && next === '/') {
                state = 'TEMPLATE_JS_LINE_COMMENT';
                i += 2;
                continue;
            } else if (ch === '/' && next === '*') {
                state = 'TEMPLATE_JS_BLOCK_COMMENT';
                i += 2;
                continue;
            } else if (ch === "'") {
                state = 'TEMPLATE_JS_SINGLE';
                result += ch;
                i++;
                continue;
            } else if (ch === '"') {
                state = 'TEMPLATE_JS_DOUBLE';
                result += ch;
                i++;
                continue;
            } else if (ch === '{') {
                templateJsStack[templateJsStack.length - 1]++;
                result += ch;
                i++;
                continue;
            } else if (ch === '}') {
                templateJsStack[templateJsStack.length - 1]--;
                if (templateJsStack[templateJsStack.length - 1] === 0) {
                    templateJsStack.pop();
                    state = 'TEMPLATE';
                }
                result += ch;
                i++;
                continue;
            } else {
                result += ch;
                i++;
                continue;
            }
        } else if (state === 'TEMPLATE_JS_LINE_COMMENT') {
            if (ch === '\n' || ch === '\r') {
                state = 'TEMPLATE_JS';
                result += ch;
            }
            i++;
            continue;
        } else if (state === 'TEMPLATE_JS_BLOCK_COMMENT') {
            if (ch === '*' && next === '/') {
                state = 'TEMPLATE_JS';
                i += 2;
                continue;
            }
            if (ch === '\n') result += '\n';
            i++;
            continue;
        } else if (state === 'TEMPLATE_JS_SINGLE') {
            result += ch;
            if (ch === '\\') { result += next; i += 2; continue; }
            if (ch === "'") state = 'TEMPLATE_JS';
            i++;
            continue;
        } else if (state === 'TEMPLATE_JS_DOUBLE') {
            result += ch;
            if (ch === '\\') { result += next; i += 2; continue; }
            if (ch === '"') state = 'TEMPLATE_JS';
            i++;
            continue;
        }
    }

    return result.replace(/(\r?\n)[ \t]*(\r?\n)+/g, '$1');
}

function stripHtmlComments(html) {
    let cleaned = html.replace(/<!--[\s\S]*?-->/g, '');
    // Inside <script> tags in html, also strip JS comments
    cleaned = cleaned.replace(/(<script\b[^>]*>)([\s\S]*?)(<\/script>)/gi, (match, open, scriptContent, close) => {
        return open + stripJsComments(scriptContent) + close;
    });
    return cleaned.replace(/(\r?\n)[ \t]*(\r?\n)+/g, '$1');
}

function run(apply = false) {
    const root = path.resolve(__dirname, '..', 'frontend');
    function filesIn(dir) {
        return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
            const f = path.join(dir, e.name);
            return e.isDirectory() ? (e.name === 'libs' || e.name === 'node_modules' ? [] : filesIn(f)) : [f];
        });
    }

    const jsFiles = filesIn(path.join(root, 'js')).filter(f => f.endsWith('.js'));
    jsFiles.push(path.join(root, 'server.js'));

    const htmlFiles = fs.readdirSync(root)
        .filter(f => f.endsWith('.html'))
        .map(f => path.join(root, f));

    console.log(`Processing ${jsFiles.length} JS files and ${htmlFiles.length} HTML files...`);

    let modifiedCount = 0;

    for (const f of jsFiles) {
        if (!fs.existsSync(f)) continue;
        const original = fs.readFileSync(f, 'utf8');
        const stripped = stripJsComments(original);
        if (original !== stripped) {
            modifiedCount++;
            if (apply) fs.writeFileSync(f, stripped, 'utf8');
        }
    }

    for (const f of htmlFiles) {
        if (!fs.existsSync(f)) continue;
        const original = fs.readFileSync(f, 'utf8');
        const stripped = stripHtmlComments(original);
        if (original !== stripped) {
            modifiedCount++;
            if (apply) fs.writeFileSync(f, stripped, 'utf8');
        }
    }

    console.log(`${apply ? 'Successfully stripped comments in' : 'Found comments in'} ${modifiedCount} files.`);
}

if (require.main === module) {
    const apply = process.argv.includes('--apply');
    run(apply);
}

module.exports = { stripJsComments, stripHtmlComments };
