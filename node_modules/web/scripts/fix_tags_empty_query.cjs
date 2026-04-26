const fs = require('fs');

let searchContent = fs.readFileSync('src/pages/Search.tsx', 'utf-8');

// 1. Fix isSearchEnabled
searchContent = searchContent.replace(
    /const isSearchEnabled = isTextSearch \|\| isGenreSearch;/,
    `const isKkphimSearch = isKkphim && (kkphimCategory || kkphimCountry || kkphimYear || kkphimSortField || kkphimType);
    const isSearchEnabled = Boolean(isTextSearch || isGenreSearch || isKkphimSearch);`
);

// 2. Fix the rendering condition for selected tags
searchContent = searchContent.replace(
    /\{selectedGenres\.length > 0 && \(/g,
    `{(selectedGenres.length > 0 || isKkphimSearch) && (`
);

// 3. Inject KKPhim tags block
const kkphimTagsCode = `
                        {isKkphim && (
                            <>
                                {kkphimType && (
                                    <div className="flex items-center gap-1 bg-[var(--color-surface-hover)] text-[var(--color-primary)] px-3 py-1 rounded-full text-sm font-medium">
                                        {t(\`kkphim.type.\${kkphimType.replace('-', '')}\`)}
                                        <button onClick={() => updateKKPhimFilter('type', '')} className="ml-1 hover:text-[var(--color-text)] transition-colors"><X size={14} /></button>
                                    </div>
                                )}
                                {kkphimSortField && (
                                    <div className="flex items-center gap-1 bg-[var(--color-surface-hover)] text-[var(--color-primary)] px-3 py-1 rounded-full text-sm font-medium">
                                        {t(\`kkphim.sort.\${kkphimSortField === 'modified.time' ? 'update' : kkphimSortField === 'year' ? 'year' : 'new'}\`)}
                                        <button onClick={() => updateKKPhimFilter('sort_field', '')} className="ml-1 hover:text-[var(--color-text)] transition-colors"><X size={14} /></button>
                                    </div>
                                )}
                                {kkphimCategory && (
                                    <div className="flex items-center gap-1 bg-[var(--color-surface-hover)] text-[var(--color-primary)] px-3 py-1 rounded-full text-sm font-medium">
                                        {t(\`kkphim.category.\${kkphimCategory}\`) === \`kkphim.category.\${kkphimCategory}\` ? KKPHIM_CATEGORIES.find(c => c.slug === kkphimCategory)?.name || kkphimCategory : t(\`kkphim.category.\${kkphimCategory}\`)}
                                        <button onClick={() => updateKKPhimFilter('category', '')} className="ml-1 hover:text-[var(--color-text)] transition-colors"><X size={14} /></button>
                                    </div>
                                )}
                                {kkphimCountry && (
                                    <div className="flex items-center gap-1 bg-[var(--color-surface-hover)] text-[var(--color-primary)] px-3 py-1 rounded-full text-sm font-medium">
                                        {t(\`kkphim.country.\${kkphimCountry}\`) === \`kkphim.country.\${kkphimCountry}\` ? KKPHIM_COUNTRIES.find(c => c.slug === kkphimCountry)?.name || kkphimCountry : t(\`kkphim.country.\${kkphimCountry}\`)}
                                        <button onClick={() => updateKKPhimFilter('country', '')} className="ml-1 hover:text-[var(--color-text)] transition-colors"><X size={14} /></button>
                                    </div>
                                )}
                                {kkphimYear && (
                                    <div className="flex items-center gap-1 bg-[var(--color-surface-hover)] text-[var(--color-primary)] px-3 py-1 rounded-full text-sm font-medium">
                                        {kkphimYear}
                                        <button onClick={() => updateKKPhimFilter('year', '')} className="ml-1 hover:text-[var(--color-text)] transition-colors"><X size={14} /></button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>`;

// Find the exact place to inject KKPhim tags. It's right before `</div>` and `)}` and `{!isSearchEnabled && debouncedQuery.length <= 2 ? (`
// Let's replace the `</div>` that closes `<div className="mb-4 flex items-center gap-2 px-2 flex-wrap">`
searchContent = searchContent.replace(
    /\{catName\}\s*<button[\s\S]*?<\/button>\s*<\/div>\s*\);\s*\}\)}\s*<\/div>/,
    `{catName}
                                    <button
                                        onClick={() => {
                                            const newGenres = selectedGenres.filter(g => g !== genre);
                                            if (newGenres.length > 0) {
                                                searchParams.set('genre', newGenres.join(','));
                                            } else {
                                                searchParams.delete('genre');
                                            }
                                            setSearchParams(searchParams, { replace: true });
                                        }}
                                        className="ml-1 hover:text-[var(--color-text)] transition-colors"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            );
                        })}
                        ${kkphimTagsCode}`
);

// 4. Fix image thumbnail and navigate route for KKPhim results
searchContent = searchContent.replace(
    /src=\{\(isNhentai \|\| isNettruyen\) \? item\.thumb_url : getImageUrl\(item\.thumb_url\)\}/,
    `src={(isNhentai || isNettruyen || isKkphim) ? item.thumb_url : getImageUrl(item.thumb_url)}`
);

searchContent = searchContent.replace(
    /onClick=\{\(\) => navigate\(\`\/comic\/\$\{sourceId \|\| 'otruyen'\}\/\$\{item\.slug\}\`\)\}/,
    `onClick={() => navigate(\`/\${isKkphim ? 'movie' : 'comic'}/\${sourceId || 'otruyen'}/\${item.slug}\`)}`
);

// 5. Add Full episode badge and Title localization for KKPhim results
searchContent = searchContent.replace(
    /<h3 className="text-\[var\(--color-text\)\] text-xs font-medium line-clamp-2">\s*\{item\.name\}\s*<\/h3>/,
    `{isKkphim && item.episode_current && (
                                    <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded bg-[#E50914] text-white text-[10px] font-bold shadow-sm z-20">
                                        {item.episode_current.toLowerCase().includes('hoàn tất') && !item.episode_current.match(/\\d/) ? 'Full' : item.episode_current}
                                    </div>
                                )}
                                <h3 className="text-[var(--color-text)] text-xs font-medium line-clamp-2 relative z-20">
                                    {isKkphim && item.origin_name && t('nav.home') !== 'Trang chủ' ? item.origin_name : item.name}
                                </h3>`
);

fs.writeFileSync('src/pages/Search.tsx', searchContent);
console.log('Fixed tags safely');
