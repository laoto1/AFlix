const fs = require('fs');
let content = fs.readFileSync('src/pages/Search.tsx', 'utf-8');

// Inject import KKPhimCard
if (!content.includes('import { KKPhimCard } from')) {
    content = content.replace(
        /import \{ useScrollRestoration \} from '\.\.\/hooks\/useScrollRestoration';/,
        `import { useScrollRestoration } from '../hooks/useScrollRestoration';\nimport { KKPhimCard } from '../components/KKPhimCard';`
    );
}

const mapStart = '{items.map((item, idx) => (';
const startIdx = content.indexOf(mapStart);

if (startIdx !== -1) {
    // Find the end of the map block by looking for "                    </div>" after "                        ))}"
    const endStr = '))}';
    const firstEndIdx = content.indexOf(endStr, startIdx);
    if (firstEndIdx !== -1) {
        // Now find the next "</div>"
        const finalEndIdx = content.indexOf('</div>', firstEndIdx);
        if (finalEndIdx !== -1) {
            const actualEnd = finalEndIdx + 6; // include "</div>"
            const originalBlock = content.substring(startIdx, actualEnd);
            
            console.log('Original Block length:', originalBlock.length);
            
            const newBlock = `{items.map((item, idx) => (
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
                    
            content = content.substring(0, startIdx) + newBlock + content.substring(actualEnd);
            fs.writeFileSync('src/pages/Search.tsx', content);
            console.log('Successfully injected KKPhimCard into Search.tsx');
        }
    }
} else {
    console.log('Could not find start index');
}
