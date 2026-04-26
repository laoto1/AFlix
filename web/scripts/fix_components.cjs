const fs = require('fs');

let content = fs.readFileSync('src/pages/Search.tsx', 'utf-8');

// 1. Remove third argument
content = content.replace(
    /return fetchKKPhimSearch\(debouncedQuery, pageParam as number, filters\);/g,
    'return fetchKKPhimSearch(debouncedQuery, pageParam as number);'
);

// 2. Fix year translation
content = content.replace(
    '<h3 className="text-sm font-medium text-[var(--color-text-muted)] mb-3">Năm phát hành</h3>',
    '<h3 className="text-sm font-medium text-[var(--color-text-muted)] mb-3">{t(\'kkphim.filter.release_year\')}</h3>'
);

fs.writeFileSync('src/pages/Search.tsx', content);

let movieDetail = fs.readFileSync('src/pages/MovieDetail.tsx', 'utf-8');
movieDetail = movieDetail.replace(
    /{movie.category\?\.map\(\(c: any\) => \(\s*<span key=\{c.id\} className="text-sm px-4 py-1.5 rounded-full bg-white\/5 border border-white\/10 text-gray-300 hover:text-\[var\(--color-primary\)\] hover:border-\[var\(--color-primary\)\] transition-colors cursor-pointer">\s*\{c.name\}\s*<\/span>\s*\)\)}/g,
    `{movie.category?.map((c: any) => (
                        <span key={c.id || c.slug || c.name} className="text-sm px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-gray-300 hover:text-[var(--color-primary)] hover:border-[var(--color-primary)] transition-colors cursor-pointer">
                            {c.slug ? (t(\`kkphim.category.\${c.slug}\`) === \`kkphim.category.\${c.slug}\` ? c.name : t(\`kkphim.category.\${c.slug}\`)) : c.name}
                        </span>
                    ))}`
);

movieDetail = movieDetail.replace(
    /{movie.country\?\.map\(\(c: any\) => \(\s*<span key=\{c.id\} className="text-sm px-4 py-1.5 rounded-full bg-white\/5 border border-white\/10 text-gray-300 hover:text-\[var\(--color-primary\)\] hover:border-\[var\(--color-primary\)\] transition-colors cursor-pointer">\s*\{c.name\}\s*<\/span>\s*\)\)}/g,
    `{movie.country?.map((c: any) => (
                        <span key={c.id || c.slug || c.name} className="text-sm px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-gray-300 hover:text-[var(--color-primary)] hover:border-[var(--color-primary)] transition-colors cursor-pointer">
                            {c.slug ? (t(\`kkphim.country.\${c.slug}\`) === \`kkphim.country.\${c.slug}\` ? c.name : t(\`kkphim.country.\${c.slug}\`)) : c.name}
                        </span>
                    ))}`
);

movieDetail = movieDetail.replace(
    /<h1 className="text-4xl md:text-6xl font-extrabold mb-2 drop-shadow-lg leading-tight text-white">\{movie.name\}<\/h1>\s*<h2 className="text-lg md:text-xl text-gray-300 font-medium mb-6 drop-shadow-md">\{movie.origin_name\}<\/h2>/g,
    `<h1 className="text-4xl md:text-6xl font-extrabold mb-2 drop-shadow-lg leading-tight text-white">{movie.origin_name && t('nav.home') !== 'Trang chủ' ? movie.origin_name : movie.name}</h1>
                            <h2 className="text-lg md:text-xl text-gray-300 font-medium mb-6 drop-shadow-md">{movie.origin_name && t('nav.home') !== 'Trang chủ' ? movie.name : movie.origin_name}</h2>`
);

fs.writeFileSync('src/pages/MovieDetail.tsx', movieDetail);
console.log('Fixed Search.tsx and MovieDetail.tsx');
