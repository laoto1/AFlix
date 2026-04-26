const fs = require('fs');
let content = fs.readFileSync('src/pages/Search.tsx', 'utf-8');

const importReplacement = `import { useScrollRestoration } from '../hooks/useScrollRestoration';\nimport { KKPhimCard } from '../components/KKPhimCard';`;
content = content.replace(/import \{ useScrollRestoration \} from '\.\.\/hooks\/useScrollRestoration';/, importReplacement);

const blockOld = `{items.map((item, idx) => (
                            <div
                                key={\`\${item._id}-\${idx}\`}
                                onClick={() => navigate(\`/\${isKkphim ? 'movie' : 'comic'}/\${sourceId || 'otruyen'}/\${item.slug}\`)}
                                className="relative aspect-[2/3] w-full rounded-md overflow-hidden bg-[#242424] cursor-pointer group hover:opacity-90 transition-opacity"
                            >
                                <img
                                    src={(isNhentai || isNettruyen || isKkphim) ? item.thumb_url : getImageUrl(item.thumb_url)}
                                    alt={item.name}
                                    loading="lazy"
                                    referrerPolicy="no-referrer"
                                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                />
                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 pt-6">
                                    {isKkphim && item.episode_current && (
                                    <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded bg-[#E50914] text-white text-[10px] font-bold shadow-sm z-20">
                                        {item.episode_current.toLowerCase().includes('hoàn tất') && !item.episode_current.match(/\\d/) ? 'Full' : item.episode_current}
                                    </div>
                                )}
                                <h3 className="text-[var(--color-text)] text-xs font-medium line-clamp-2 relative z-20">
                                    {isKkphim && item.origin_name && t('nav.home') !== 'Trang chủ' ? item.origin_name : item.name}
                                </h3>
                                </div>
                            </div>
                        ))}
                    </div>`;

const blockNew = `{items.map((item, idx) => (
                            isKkphim ? (
                                <KKPhimCard key={\`\${item._id || item.slug}-\${idx}\`} movie={item} sourceId={sourceId || 'kkphim'} />
                            ) : (
                                <div
                                    key={\`\${item._id || item.slug}-\${idx}\`}
                                    onClick={() => navigate(\`/comic/\${sourceId || 'otruyen'}/\${item.slug}\`)}
                                    className="relative aspect-[2/3] w-full rounded-md overflow-hidden bg-[#242424] cursor-pointer group hover:opacity-90 transition-opacity"
                                >
                                    <img
                                        src={(isNhentai || isNettruyen) ? item.thumb_url : getImageUrl(item.thumb_url)}
                                        alt={item.name}
                                        loading="lazy"
                                        referrerPolicy="no-referrer"
                                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                    />
                                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 pt-6">
                                        <h3 className="text-[var(--color-text)] text-xs font-medium line-clamp-2 relative z-20">
                                            {item.name}
                                        </h3>
                                    </div>
                                </div>
                            )
                        ))}
                    </div>`;

if (content.includes(blockOld)) {
    content = content.replace(blockOld, blockNew);
    fs.writeFileSync('src/pages/Search.tsx', content);
    console.log('Fixed block correctly');
} else {
    console.log('Could not find exact block blockOld');
}
