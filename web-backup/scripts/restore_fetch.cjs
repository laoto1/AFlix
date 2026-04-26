const fs = require('fs');

let kkphimContent = fs.readFileSync('src/services/kkphim.ts', 'utf-8');

kkphimContent = kkphimContent.replace(
    /export const fetchList = async \(slug: string, page: number = 1\) => \{/,
    `export const fetchList = async (slug: string, page: number = 1, filters: Record<string, string> = {}) => {
    // Advanced Search via ophim1 because phimapi doesn't support empty keyword search filtering
    if (slug === 'advanced-search') {
        const type = filters['type'];
        const params = new URLSearchParams({ page: page.toString() });
        
        // ophim1.com/v1/api/tim-kiem fails if type= is provided! 
        // We MUST use /danh-sach/{type} if type is selected!
        const endpoint = type ? \`/v1/api/danh-sach/\${type}\` : \`/v1/api/tim-kiem\`;
        
        if (!type) {
            params.append('keyword', '');
        }

        Object.entries(filters).forEach(([k, v]) => {
            if (k !== 'type' && v) params.append(k, v);
        });

        const res = await fetch(\`https://ophim1.com\${endpoint}?\${params.toString()}\`).then(r => r.json());
        
        const cdnDomain = res.data?.APP_DOMAIN_CDN_IMAGE || 'https://img.ophim.live';
        const items = (res.data?.items || []).map((item: any) => ({
            ...item,
            thumb_url: \`\${cdnDomain}/uploads/movies/\${item.thumb_url || item.poster_url}\`,
            poster_url: \`\${cdnDomain}/uploads/movies/\${item.poster_url || item.thumb_url}\`
        }));

        return {
            data: {
                items,
                pagination: res.data?.params?.pagination,
                APP_DOMAIN_CDN_IMAGE: cdnDomain
            }
        };
    }`
);

fs.writeFileSync('src/services/kkphim.ts', kkphimContent);

let searchContent = fs.readFileSync('src/pages/Search.tsx', 'utf-8');
searchContent = searchContent.replace(
    /if \(isKkphim\) \{\s*if \(debouncedQuery\) \{\s*return fetchKKPhimSearch\(debouncedQuery, pageParam as number\);\s*\} else \{\s*return fetchKKPhimList\('phim-moi-cap-nhat', pageParam as number\); \/\/ fallback to list\s*\}\s*\}/,
    `if (isKkphim) {
                const filters = {
                    category: kkphimCategory,
                    country: kkphimCountry,
                    year: kkphimYear,
                    sort_field: kkphimSortField,
                    type: kkphimType
                };
                if (debouncedQuery) {
                    return fetchKKPhimSearch(debouncedQuery, pageParam as number);
                } else {
                    return fetchKKPhimList('advanced-search', pageParam as number, filters);
                }
            }`
);

fs.writeFileSync('src/pages/Search.tsx', searchContent);
console.log('Restored Advanced Search logic in kkphim.ts and Search.tsx!');
