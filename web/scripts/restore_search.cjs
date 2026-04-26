const fs = require('fs');

let searchContent = fs.readFileSync('src/pages/Search.tsx', 'utf-8');

// Add imports
if (!searchContent.includes('import { fetchList as fetchKKPhimList')) {
    searchContent = searchContent.replace(
        "import * as KKPhimService from '../services/kkphim';",
        ""
    );
    searchContent = searchContent.replace(
        "import { useScrollRestoration } from '../hooks/useScrollRestoration';",
        "import { useScrollRestoration } from '../hooks/useScrollRestoration';\nimport { fetchList as fetchKKPhimList, fetchSearch as fetchKKPhimSearch, CATEGORIES as KKPHIM_CATEGORIES, COUNTRIES as KKPHIM_COUNTRIES, TYPES as KKPHIM_TYPES, SORT_FIELDS as KKPHIM_SORT_FIELDS, YEARS as KKPHIM_YEARS } from '../services/kkphim';"
    );
}

// Add isKkphim
if (!searchContent.includes('const isKkphim = sourceId === \'kkphim\';')) {
    searchContent = searchContent.replace(
        "const isNettruyen = sourceId === 'nettruyen';",
        "const isNettruyen = sourceId === 'nettruyen';\n    const isKkphim = sourceId === 'kkphim';"
    );
}

// Add state variables
if (!searchContent.includes('const kkphimCategory = searchParams.get(')) {
    searchContent = searchContent.replace(
        "const [activeNhentaiTab, setActiveNhentaiTab] = useState('tags');",
        `const [activeNhentaiTab, setActiveNhentaiTab] = useState('tags');
    const kkphimCategory = searchParams.get('category') || '';
    const kkphimCountry = searchParams.get('country') || '';
    const kkphimYear = searchParams.get('year') || '';
    const kkphimSortField = searchParams.get('sort_field') || '';
    const kkphimType = searchParams.get('type') || '';
    
    const updateKKPhimFilter = (key: string, value: string) => {
        if (value) searchParams.set(key, value);
        else searchParams.delete(key);
        searchParams.delete('genre');
        setSearchParams(searchParams, { replace: true });
    };`
    );
}

// Fix queryKeyParam
searchContent = searchContent.replace(
    /const queryKeyParam = isNhentai\s*\?\s*`\$\{debouncedQuery\} \$\{selectedGenres\.join\(' '\)\}`\.trim\(\)\s*:\s*`\$\{debouncedQuery\}-\$\{selectedGenres\.join\(','\)\}`;/,
    `const queryKeyParam = isNhentai
        ? \`\${debouncedQuery} \${selectedGenres.join(' ')}\`.trim()
        : isKkphim 
        ? \`\${debouncedQuery}-\${kkphimCategory}-\${kkphimCountry}-\${kkphimYear}-\${kkphimSortField}-\${kkphimType}\`
        : \`\${debouncedQuery}-\${selectedGenres.join(',')}\`;`
);

// Add useInfiniteQuery block
if (!searchContent.includes('if (isKkphim) {')) {
    searchContent = searchContent.replace(
        "if (isNettruyen) {",
        `if (isKkphim) {
                if (debouncedQuery) {
                    return fetchKKPhimSearch(debouncedQuery, pageParam as number);
                } else {
                    return fetchKKPhimList('phim-moi-cap-nhat', pageParam as number); // fallback to list
                }
            }
            if (isNettruyen) {`
    );
}

// Add to modal
if (!searchContent.includes('{isKkphim && (')) {
    searchContent = searchContent.replace(
        "{!isNhentaiTags && (",
        `{isKkphim && (
                                        <div className="flex flex-col gap-6">
                                            <div>
                                                <h3 className="text-sm font-medium text-[var(--color-text-muted)] mb-3">{t('kkphim.filter.type')}</h3>
                                                <div className="flex flex-wrap gap-2">
                                                    {KKPHIM_TYPES.map(tOption => (
                                                        <button
                                                            key={tOption.slug}
                                                            className={\`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border \${kkphimType === tOption.slug
                                                                ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)] border-[var(--color-primary)]'
                                                                : 'bg-[var(--color-surface-hover)] text-[var(--color-text)] border-transparent hover:border-[#9e9e9e]'
                                                                }\`}
                                                            onClick={() => updateKKPhimFilter('type', kkphimType === tOption.slug ? '' : tOption.slug)}
                                                        >
                                                            {t(\`kkphim.type.\${tOption.slug.replace('-', '')}\`)}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div>
                                                <h3 className="text-sm font-medium text-[var(--color-text-muted)] mb-3">{t('kkphim.filter.sort')}</h3>
                                                <div className="flex flex-wrap gap-2">
                                                    {KKPHIM_SORT_FIELDS.map(sort => (
                                                        <button
                                                            key={sort.value}
                                                            className={\`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border \${kkphimSortField === sort.value
                                                                ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)] border-[var(--color-primary)]'
                                                                : 'bg-[var(--color-surface-hover)] text-[var(--color-text)] border-transparent hover:border-[#9e9e9e]'
                                                                }\`}
                                                            onClick={() => updateKKPhimFilter('sort_field', kkphimSortField === sort.value ? '' : sort.value)}
                                                        >
                                                            {t(\`kkphim.sort.\${sort.value === 'modified.time' ? 'update' : sort.value === 'year' ? 'year' : 'new'}\`)}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            
                                            <div>
                                                <h3 className="text-sm font-medium text-[var(--color-text-muted)] mb-3">{t('search.genres')}</h3>
                                                <div className="flex flex-wrap gap-2">
                                                    {KKPHIM_CATEGORIES.map(cat => (
                                                        <button
                                                            key={cat.slug}
                                                            className={\`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border \${kkphimCategory === cat.slug
                                                                ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)] border-[var(--color-primary)]'
                                                                : 'bg-[var(--color-surface-hover)] text-[var(--color-text)] border-transparent hover:border-[#9e9e9e]'
                                                                }\`}
                                                            onClick={() => updateKKPhimFilter('category', kkphimCategory === cat.slug ? '' : cat.slug)}
                                                        >
                                                            {t(\`kkphim.category.\${cat.slug}\`) === \`kkphim.category.\${cat.slug}\` ? cat.name : t(\`kkphim.category.\${cat.slug}\`)}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div>
                                                <h3 className="text-sm font-medium text-[var(--color-text-muted)] mb-3">{t('kkphim.filter.country')}</h3>
                                                <div className="flex flex-wrap gap-2">
                                                    {KKPHIM_COUNTRIES.map(country => (
                                                        <button
                                                            key={country.slug}
                                                            className={\`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border \${kkphimCountry === country.slug
                                                                ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)] border-[var(--color-primary)]'
                                                                : 'bg-[var(--color-surface-hover)] text-[var(--color-text)] border-transparent hover:border-[#9e9e9e]'
                                                                }\`}
                                                            onClick={() => updateKKPhimFilter('country', kkphimCountry === country.slug ? '' : country.slug)}
                                                        >
                                                            {t(\`kkphim.country.\${country.slug}\`) === \`kkphim.country.\${country.slug}\` ? country.name : t(\`kkphim.country.\${country.slug}\`)}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div>
                                                <h3 className="text-sm font-medium text-[var(--color-text-muted)] mb-3">{t('kkphim.filter.release_year')}</h3>
                                                <div className="flex flex-wrap gap-2">
                                                    {KKPHIM_YEARS.map(y => (
                                                        <button
                                                            key={y}
                                                            className={\`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border \${kkphimYear === y
                                                                ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)] border-[var(--color-primary)]'
                                                                : 'bg-[var(--color-surface-hover)] text-[var(--color-text)] border-transparent hover:border-[#9e9e9e]'
                                                                }\`}
                                                            onClick={() => updateKKPhimFilter('year', kkphimYear === y ? '' : y)}
                                                        >
                                                            {y}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    
                                    {!isNhentaiTags && !isKkphim && (`
    );
}

fs.writeFileSync('src/pages/Search.tsx', searchContent);
console.log('Restored Advanced Search in Search.tsx!');
