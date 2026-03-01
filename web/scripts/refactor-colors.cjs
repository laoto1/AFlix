const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../src');

const replacements = [
    { from: /bg-\[#121212\]/g, to: 'bg-[var(--color-bg)]' },
    { from: /bg-\[#1e1e1e\]/g, to: 'bg-[var(--color-surface)]' },
    { from: /bg-\[#2c2c2c\]/g, to: 'bg-[var(--color-surface-hover)]' },
    { from: /border-\[#2c2c2c\]/g, to: 'border-[var(--color-border)]' },
    { from: /text-\[#f97316\]/g, to: 'text-[var(--color-primary)]' },
    { from: /bg-\[#f97316\]/g, to: 'bg-[var(--color-primary)]' },
    { from: /border-\[#f97316\]/g, to: 'border-[var(--color-primary)]' },
    { from: /text-\[#e0e0e0\]/g, to: 'text-[var(--color-text)]' },
    { from: /text-\[#9e9e9e\]/g, to: 'text-[var(--color-text-muted)]' },
    { from: /text-white/g, to: 'text-[var(--color-text)]' }, // Mostly true
    { from: /bg-white/g, to: 'bg-[var(--color-surface)]' }, // some modals?
];

function processDirectory(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDirectory(fullPath);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let modified = false;

            for (const r of replacements) {
                if (content.match(r.from)) {
                    content = content.replace(r.from, r.to);
                    modified = true;
                }
            }

            if (modified) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log(`Updated ${fullPath}`);
            }
        }
    }
}

processDirectory(srcDir);
console.log('Done refactoring colors!');
