import type { Handler } from '@netlify/functions';
import axios from 'axios';
import { Hono } from 'hono';
import { Env } from '../index';

const nhentai_tags = new Hono<{ Bindings: Env }>();

interface TagEntry {
    _id: string;
    name: string;
    slug: string;
    type: string;
    count: string;
    tagId: number;
}

// NClientV3 numeric type mapping
const TYPE_MAP: Record<number, string> = {
    1: 'parodies',
    2: 'characters',
    3: 'tags',
    4: 'artists',
    5: 'groups',
};

nhentai_tags.get('/', async (c) => {
    const event = { queryStringParameters: c.req.query(), path: c.req.path };
    const action = event.queryStringParameters?.action;

    // Feature: search by gallery ID (page number)
    if (action === 'byid') {
        const id = event.queryStringParameters?.id;
        if (!id) {
            return c.json({ error: 'Missing id parameter' }, 400 as any);
        }

        try {
            const res = await axios.get(`https://nhentai.net/api/gallery/${id}`, { 
                headers: { 'User-Agent': 'Mozilla/5.0' }, 
                timeout: 8000 
            });
            const gallery = res.data;

            if (!gallery || gallery.error) {
                return c.json({ status: 'error', error: 'Gallery not found' }, 404 as any);
            }

            const mediaId = gallery.media_id;
            const thumb = `https://t.nhentai.net/galleries/${mediaId}/thumb.jpg`;

            return c.json({
                    status: 'success',
                    data: {
                        items: [{
                            _id: String(gallery.id),
                            name: gallery.title?.english || gallery.title?.japanese || gallery.title?.pretty || '',
                            slug: String(gallery.id),
                            thumb_url: thumb,
                            chaptersLatest: [{ chapter_name: 'Full' }]
                        }],
                        params: { pagination: { currentPage: 1, totalItems: 1, totalItemsPerPage: 1 } }
                    }
                }, 200 as any);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            return c.json({ error: 'Failed to fetch gallery', details: errorMessage }, 500 as any);
        }
    }

    // Default: Fetch NClientV3 static tags database via jsDelivr CDN with Cloudflare Edge caching
    try {
        const fetchRes = await fetch('https://cdn.jsdelivr.net/gh/maxwai/NClientV3@master/data/tags.json', {
            cf: { cacheTtl: 86400, cacheEverything: true }
        });
        
        if (!fetchRes.ok) {
            throw new Error(`CDN returned status ${fetchRes.status}`);
        }
        
        const data: [number, string, number, number][] = await fetchRes.json();

        const itemsMap: Record<string, Map<string, TagEntry>> = {
            tags: new Map(), artists: new Map(), characters: new Map(), parodies: new Map(), groups: new Map()
        };

        for (const [id, name, count, typeId] of data) {
            const category = TYPE_MAP[typeId];
            if (!category) continue; // Skip languages and categories (6 and 7)
            
            const slug = name.replace(/ /g, '-');
            const existing = itemsMap[category].get(slug);
            
            if (!existing || parseInt(existing.count) < count) {
                itemsMap[category].set(slug, {
                    _id: String(id),
                    name: name,
                    slug: slug,
                    type: category,
                    count: String(count),
                    tagId: id
                });
            }
        }

        const items: Record<string, TagEntry[]> = {
            tags: [], artists: [], characters: [], parodies: [], groups: []
        };

        // Convert Map to arrays and Sort by count descending
        for (const type of Object.keys(itemsMap)) {
            items[type] = Array.from(itemsMap[type].values());
            items[type].sort((a, b) => parseInt(b.count) - parseInt(a.count));
        }

        const totalCount = Object.values(items).reduce((sum, arr) => sum + arr.length, 0);

        return c.json({
                status: 'success',
                pagesScraped: 1,
                totalTags: totalCount,
                data: {
                    items,
                    counts: {
                        tags: items.tags.length,
                        artists: items.artists.length,
                        characters: items.characters.length,
                        parodies: items.parodies.length,
                        groups: items.groups.length,
                    }
                }
            }, 200 as any);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        return c.json({ error: 'Failed to load tags database', details: errorMessage }, 500 as any);
    }
});

export default nhentai_tags;
