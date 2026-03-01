import type { Handler } from '@netlify/functions';
import axios from 'axios';
import { Hono } from 'hono';
import { Env } from '../index';

/**
 * Nhentai Tags Function — Using nhentai's internal JSON API
 * 
 * nhentai has an undocumented JSON API at /api/ that returns structured data.
 * Unlike HTML pages, these JSON endpoints bypass Cloudflare's JS challenge.
 * 
 * Each gallery in the API response includes all its tags as structured objects:
 *   { id, type, name, url, count }
 * where type is one of: "tag", "artist", "character", "parody", "group", "language", "category"
 * 
 * Strategy: Fetch N pages of popular galleries via the JSON API,
 * extract ALL unique tags from them, grouped by type.
 * 
 * Also supports search by gallery ID (page number) via ?id=XXXXX
 */

const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Accept': 'application/json',
};

const DELAY_MS = 200;
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

interface NhentaiTag {
    id: number;
    type: string;
    name: string;
    url: string;
    count: number;
}

interface TagEntry {
    _id: string;
    name: string;
    slug: string;
    type: string;
    count: string;
    tagId: number;
}

// Map nhentai API tag types to our category names
const TYPE_MAP: Record<string, string> = {
    'tag': 'tags',
    'artist': 'artists',
    'character': 'characters',
    'parody': 'parodies',
    'group': 'groups',
};

const WANTED_TYPES = new Set(Object.keys(TYPE_MAP));

const nhentai_tags = new Hono<{ Bindings: Env }>();

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
            const res = await axios.get(`https://nhentai.net/api/gallery/${id}`, { headers, timeout: 8000 });
            const gallery = res.data;

            if (!gallery || gallery.error) {
                return c.json({ status: 'error', error: 'Gallery not found' }, 404 as any);
            }

            // Format as a search result item
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

    // Default: Build tag database from popular galleries via JSON API
    const searchPages = Math.min(parseInt(c.req.query('pages') || '15'), 30);

    try {
        const aggregated: Record<string, Map<string, TagEntry>> = {
            tags: new Map(), artists: new Map(), characters: new Map(), parodies: new Map(), groups: new Map()
        };

        for (let page = 1; page <= searchPages; page++) {
            try {
                // Use the internal JSON API — returns structured data, bypasses Cloudflare
                const res = await axios.get(
                    `https://nhentai.net/api/galleries/search?query=""&sort=popular&page=${page}`,
                    { headers, timeout: 10000 }
                );

                const galleries = res.data?.result || [];

                for (const gallery of galleries) {
                    const galleryTags: NhentaiTag[] = gallery.tags || [];

                    for (const tag of galleryTags) {
                        if (!WANTED_TYPES.has(tag.type)) continue;

                        const category = TYPE_MAP[tag.type];
                        const slug = tag.name.replace(/ /g, '-');

                        if (!aggregated[category].has(slug)) {
                            aggregated[category].set(slug, {
                                _id: String(tag.id),
                                name: tag.name,
                                slug,
                                type: category,
                                count: String(tag.count),
                                tagId: tag.id,
                            });
                        }
                    }
                }
            } catch {
                // Individual page failures are not fatal
            }

            if (page < searchPages) await sleep(DELAY_MS);
        }

        // Convert maps to sorted arrays (sorted by count descending)
        const items: Record<string, TagEntry[]> = {};
        for (const type of Object.keys(aggregated)) {
            items[type] = Array.from(aggregated[type].values())
                .sort((a, b) => parseInt(b.count || '0') - parseInt(a.count || '0'));
        }

        const totalCount = Object.values(items).reduce((sum, arr) => sum + arr.length, 0);

        return c.json({
                status: 'success',
                pagesScraped: searchPages,
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
        return c.json({ error: 'Failed to build tag database', details: errorMessage }, 500 as any);
    }
});

export default nhentai_tags;
