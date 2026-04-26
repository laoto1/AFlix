const fs = require('fs');

let searchContent = fs.readFileSync('src/pages/Search.tsx', 'utf-8');

// 1. Import KKPhimCard
if (!searchContent.includes('import { KKPhimCard } from')) {
    searchContent = searchContent.replace(
        /import \{ useScrollRestoration \} from '\.\.\/hooks\/useScrollRestoration';/,
        `import { useScrollRestoration } from '../hooks/useScrollRestoration';\nimport { KKPhimCard } from '../components/KKPhimCard';`
    );
}

// 2. Replace the exact block
const oldBlockStart = `{items.map((item, idx) => (`
const oldBlockEnd = `))}
                    </div>`

const startIdx = searchContent.indexOf(oldBlockStart);
if (startIdx !== -1) {
    const endIdx = searchContent.indexOf(oldBlockEnd, startIdx);
    if (endIdx !== -1) {
        const replacement = `{items.map((item, idx) => (
                            isKkphim ? (
                                <KKPhimCard key={\`\${item._id || item.slug}-\${idx}\`} movie={item} sourceId={sourceId || 'kkphim'} />
                            ) : (
                                <div
                                    key={\`\${item._id || item.slug}-\${idx}\`}
                                    onClick={() => navigate(\`/comic/\${sourceId || 'otruyen'}/\${item.slug}\`)}
                                    className="relative aspect-[2/3] w-full rounded-md overflow-hidden bg-[#242424] cursor-pointer group hover:opacity-90 transition-opacity"
                                >
                                    <img
                                        src={(isNhentai || isNettruyen || isKkphim) ? item.thumb_url : getImageUrl(item.thumb_url)}
                                        alt={item.name}
                                        loading="lazy"
                                        referrerPolicy="no-referrer"
                                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                    />
                                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 pt-6 z-10">
                                        <h3 className="text-[var(--color-text)] text-xs font-medium line-clamp-2 relative z-20">
                                            {item.name}
                                        </h3>
                                    </div>
                                </div>
                            )
                        ))}
                    </div>`;
        
        searchContent = searchContent.substring(0, startIdx) + replacement + searchContent.substring(endIdx + oldBlockEnd.length);
        fs.writeFileSync('src/pages/Search.tsx', searchContent);
        console.log('Successfully replaced KKPhimCard logic');
    } else {
        console.log('End block not found');
    }
} else {
    console.log('Start block not found');
}
