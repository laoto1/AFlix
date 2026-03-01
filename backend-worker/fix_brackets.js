const fs = require('fs');
const path = require('path');

// Fix nhentai
let nft = fs.readFileSync('src/routes/nhentai.ts', 'utf8');
nft = nft.replace('};\n\nexport default nhentai;', '});\n\nexport default nhentai;');
fs.writeFileSync('src/routes/nhentai.ts', nft);

// Fix nhentai-tags
let ntg = fs.readFileSync('src/routes/nhentai-tags.ts', 'utf8');
ntg = ntg.replace('};\n\nexport default nhentai_tags;', '});\n\nexport default nhentai_tags;');
fs.writeFileSync('src/routes/nhentai-tags.ts', ntg);

// Fix nettruyen JSON brackets
let net = fs.readFileSync('src/routes/nettruyen.ts', 'utf8');

net = net.replace(
`        return c.json({
                status: 'success',
                data: {
                    items,
                    params: {
                        pagination: {
                            currentPage: parseInt(pageStr),
                            totalItems: totalPages * (items.length || 24),
                            totalItemsPerPage: items.length || 24,
                        },
                    },
                },
            }),
        };
    };`, 
`        return c.json({
            status: 'success',
            data: {
                items,
                params: {
                    pagination: {
                        currentPage: parseInt(pageStr),
                        totalItems: totalPages * (items.length || 24),
                        totalItemsPerPage: items.length || 24,
                    },
                },
            },
        }, 200 as any);
    };`);

net = net.replace(
`        // ── DETAIL ──
        if (action === 'detail') {
            if (!slug) return { statusCode: 400, body: JSON.stringify({ error: 'Missing slug' }, 400 as any);`,
`        // ── DETAIL ──
        if (action === 'detail') {
            if (!slug) return c.json({ error: 'Missing slug' }, 400 as any);`);

net = net.replace(
`            return c.json({
                    status: 'success',
                    data: {
                        item: {
                            _id: slug,
                            name: title,
                            slug,
                            thumb_url: thumb,
                            origin_name: [altTitle],
                            author: [author],
                            status,
                            content,
                            category: categories,
                            chapters: [{
                                server_name: 'Server 1',
                                server_data: chapters,
                            }],
                        },
                    },
                }),
            };
        }`,
`            return c.json({
                status: 'success',
                data: {
                    item: {
                        _id: slug,
                        name: title,
                        slug,
                        thumb_url: thumb,
                        origin_name: [altTitle],
                        author: [author],
                        status,
                        content,
                        category: categories,
                        chapters: [{
                            server_name: 'Server 1',
                            server_data: chapters,
                        }],
                    },
                },
            }, 200 as any);
        }`);

net = net.replace(
`        // ── CHAPTER (images) ──
        if (action === 'chapter') {
            if (!slug || !chapter) {
                return { statusCode: 400, body: JSON.stringify({ error: 'Missing slug or chapter' }, 200 as any);
            }`,
`        // ── CHAPTER (images) ──
        if (action === 'chapter') {
            if (!slug || !chapter) {
                return c.json({ error: 'Missing slug or chapter' }, 400 as any);
            }`);

net = net.replace(
`            return {
                statusCode: 200,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: 'success',
                    data: {
                        domain_cdn: '',
                        item: {
                            chapter_image: images.map(img => ({ image_file: img })),
                        },
                    },
                }),
            };
        }`,
`            return c.json({
                status: 'success',
                data: {
                    domain_cdn: '',
                    item: {
                        chapter_image: images.map(img => ({ image_file: img })),
                    },
                },
            }, 200 as any);
        }`);

net = net.replace(
`            return {
                statusCode: 200,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'success', data: { items: categories } }),
            };
        }`,
`            return c.json({ status: 'success', data: { items: categories } }, 200 as any);
        }`);

net = net.replace(
`        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Unsupported action. Use: latest, popular, search, detail, chapter, categories' }),
        };
    } catch (error: any) {
        console.error('Nettruyen API Error:', error.message);
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: 'Failed to scrape nettruyen. All domains may be down.',
                details: error.message,
            }),
        };
    }
};`,
`        return c.json({ error: 'Unsupported action. Use: latest, popular, search, detail, chapter, categories' }, 400 as any);
    } catch (error: any) {
        console.error('Nettruyen API Error:', error.message);
        return c.json({
            error: 'Failed to scrape nettruyen. All domains may be down.',
            details: error.message,
        }, 500 as any);
    }
});`);

fs.writeFileSync('src/routes/nettruyen.ts', net);
console.log('Fixed brackets');
