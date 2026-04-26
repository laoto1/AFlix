const fs = require('fs');

let kkphimContent = fs.readFileSync('src/services/kkphim.ts', 'utf-8');

kkphimContent = kkphimContent.replace(
    /const res = await fetch\(`\$\{BASE\}\/v1\/api\/danh-sach\/\$\{slug\}\?page=\$\{page\}`\)\.then\(r => r\.json\(\)\);/,
    `const params = new URLSearchParams({ page: page.toString() });
    Object.entries(filters).forEach(([k, v]) => {
        if (v) params.append(k, v);
    });
    const res = await fetch(\`\${BASE}/v1/api/danh-sach/\${slug}?\${params.toString()}\`).then(r => r.json());`
);

kkphimContent = kkphimContent.replace(
    /const res = await fetch\(`\$\{BASE\}\/danh-sach\/\$\{slug\}\?page=\$\{page\}`\)\.then\(r => r\.json\(\)\);/,
    `const params = new URLSearchParams({ page: page.toString() });
    Object.entries(filters).forEach(([k, v]) => {
        if (v) params.append(k, v);
    });
    const res = await fetch(\`\${BASE}/danh-sach/\${slug}?\${params.toString()}\`).then(r => r.json());`
);

fs.writeFileSync('src/services/kkphim.ts', kkphimContent);
console.log('Fixed tags in MovieSourceDetail.tsx');
