const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');
const { compile } = require('@vue/compiler-dom');

const root = path.resolve(__dirname, '..');
function filesIn(directory) {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
        const file = path.join(directory, entry.name);
        return entry.isDirectory() ? (entry.name === 'libs' ? [] : filesIn(file)) : [file];
    });
}

let failures = 0, templates = 0;
const scripts = filesIn(path.join(root, 'js')).filter(file => file.endsWith('.js'));
for (const file of scripts) {
    const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
    if (result.status !== 0) {
        failures++;
        process.stderr.write(result.stderr || `Could not check ${file}\n`);
    }
}
for (const directory of ['views', 'components', 'layouts']) {
    for (const file of filesIn(path.join(root, 'js', directory)).filter(file => file.endsWith('.js'))) {
        const context = { window: {}, Vue: {} };
        try {
            const source = fs.readFileSync(file, 'utf8');
            if (!/\btemplate\s*[:=]/.test(source)) continue;
            vm.runInNewContext(source, context, { filename: file, timeout: 1000 });
            for (const component of Object.values(context.window)) {
                if (typeof component?.template !== 'string') continue;
                templates++;
                compile(component.template, { onError(error) {
                    failures++;
                    console.error(`${path.relative(root, file)}: template line ${error.loc?.start?.line}: ${error.message}`);
                } });
            }
        } catch (error) {
            failures++;
            console.error(`${path.relative(root, file)}: ${error.message}`);
        }
    }
}
console.log(`Checked ${scripts.length} scripts and ${templates} templates; ${failures} errors.`);
process.exitCode = failures ? 1 : 0;
