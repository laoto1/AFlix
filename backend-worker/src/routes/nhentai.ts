import { Hono } from 'hono';
import { Env } from '../index';
import axios from 'axios';
import * as cheerio from 'cheerio';

const nhentai = new Hono<{ Bindings: Env }>();

nhentai.get('/', async (c) => {
    const event = { queryStringParameters: c.req.query(), path: c.req.path };
    const { action, page = '1', slug = '', q = '', sort = '' } = event.queryStringParameters || {};

    try {
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        };

        if (action === 'latest' || action === 'completed' || action === 'popular') {
            let url: string;
            if (action === 'popular') {
                const popularSort = sort || 'popular-today';
                url = `https://nhentai.net/search/?q=""&sort=${popularSort}&page=${page}`;
            } else {
                // Homepage shows "New Uploads" — the actual latest content
                url = `https://nhentai.net/?page=${page}`;
            }
            const res = await axios.get(url, { headers });
            const $ = cheerio.load(res.data);

            const items: any[] = [];
            let skipped = 0;
            // On page 1 of homepage, first ~5 galleries are "Popular Right Now" — skip them
            const skipCount = (action !== 'popular' && parseInt(page as string) === 1) ? 5 : 0;
            $('.gallery').each((_, el) => {
                const id = $(el).find('a').attr('href')?.split('/')[2];
                const title = $(el).find('.caption').text();
                const thumb = $(el).find('img').attr('data-src') || $(el).find('img').attr('src');

                if (id && title && thumb) {
                    if (skipped < skipCount) {
                        skipped++;
                        return; // Skip "Popular Right Now" items on page 1
                    }
                    items.push({
                        _id: id,
                        name: title,
                        slug: id,
                        thumb_url: thumb,
                        chaptersLatest: [{ chapter_name: 'Full' }]
                    });
                }
            });

            // Clean up URLs
            items.forEach(item => {
                if (item.thumb_url && item.thumb_url.startsWith('//')) {
                    item.thumb_url = 'https:' + item.thumb_url;
                }
                item.thumb_url = item.thumb_url.replace(/&amp;/g, '&');
            });

            let totalPages = 500;
            const lastPageUrl = $('.pagination .last').attr('href');
            if (lastPageUrl) {
                const match = lastPageUrl.match(/page=(\d+)/);
                if (match) totalPages = parseInt(match[1]);
            }

            return c.json({
                    status: 'success',
                    data: {
                        items,
                        params: {
                            pagination: {
                                currentPage: parseInt(page as string),
                                totalItems: totalPages * (items.length || 20),
                                totalItemsPerPage: items.length || 20
                            }
                        }
                    }
                }, 200 as any);
        }

        if (action === 'search') {
            // Nhentai's search URL format: /search/?q=tag1+tag2&page=1&sort=popular
            const queryUrl = new URL('https://nhentai.net/search/');
            queryUrl.searchParams.set('q', q as string);
            queryUrl.searchParams.set('page', page as string);
            if (sort) queryUrl.searchParams.set('sort', sort as string);

            const res = await axios.get(queryUrl.toString(), { headers });
            const $ = cheerio.load(res.data);

            const items: any[] = [];
            $('.gallery').each((_, el) => {
                const id = $(el).find('a').attr('href')?.split('/')[2];
                const title = $(el).find('.caption').text();
                const thumb = $(el).find('img').attr('data-src') || $(el).find('img').attr('src');

                if (id && title && thumb) {
                    items.push({
                        _id: id,
                        name: title,
                        slug: id,
                        thumb_url: thumb,
                        chaptersLatest: [{ chapter_name: 'Full' }]
                    });
                }
            });

            items.forEach(item => {
                if (item.thumb_url && item.thumb_url.startsWith('//')) {
                    item.thumb_url = 'https:' + item.thumb_url;
                }
                item.thumb_url = item.thumb_url.replace(/&amp;/g, '&');
            });

            let totalPages = 1;
            const lastPageUrl = $('.pagination .last').attr('href');
            if (lastPageUrl) {
                const match = lastPageUrl.match(/page=(\d+)/);
                if (match) totalPages = parseInt(match[1]);
            } else {
                // Determine if there is a pagination at all. If not, maybe just 1 page.
                if ($('.pagination').length > 0) {
                    const lastPaginationText = $('.pagination .page').last().text();
                    if (lastPaginationText) {
                        totalPages = parseInt(lastPaginationText);
                    }
                }
            }

            return c.json({
                    status: 'success',
                    data: {
                        items,
                        params: {
                            pagination: {
                                currentPage: parseInt(page as string),
                                totalItems: totalPages * (items.length || 20),
                                totalItemsPerPage: items.length || 20
                            }
                        }
                    }
                }, 200 as any);
        }

        if (action === 'detail') {
            if (!slug) return c.json({ error: 'Missing slug/id' }, 400 as any);

            const url = `https://nhentai.net/g/${slug}/`;
            const res = await axios.get(url, { headers });
            const $ = cheerio.load(res.data);

            const title = $('#info h1').text();
            const originalTitle = $('#info h2').text();

            // Re-use the large cover
            let thumb_url = $('#cover img').attr('data-src') || $('#cover img').attr('src');
            if (thumb_url && thumb_url.startsWith('//')) thumb_url = 'https:' + thumb_url;

            const tagsText: string[] = [];

            $('.tag-container:contains("Tags") .name').each((_, el) => {
                tagsText.push($(el).text());
            });

            $('.tag-container:contains("Parodies") .name').each((_, el) => {
                tagsText.push($(el).text());
            });

            let pages = '0';
            $('.tag-container:contains("Pages") .name').each((_, el) => {
                pages = $(el).text();
            });

            const authors: string[] = [];
            $('.tag-container:contains("Artists") .name').each((_, el) => {
                authors.push($(el).text());
            });

            $('.tag-container:contains("Groups") .name').each((_, el) => {
                authors.push($(el).text());
            });
            
            const uploadedAt = $('time').text() || $('time').attr('datetime') || '';

            const content = `Pages: ${pages} | Original Title: ${originalTitle}`;

            return c.json({
                    status: 'success',
                    data: {
                        item: {
                            _id: slug,
                            name: title,
                            slug: slug,
                            thumb_url,
                            author: authors.length > 0 ? authors : ['N/A'],
                            category: tagsText.map(t => ({ name: t, slug: t.replace(/ /g, '-') })),
                            content,
                            chapters: [{
                                server_name: 'Gallery',
                                server_data: [{
                                    chapter_name: 'Full',
                                    update_time: uploadedAt,
                                    chapter_api_data: `api/nhentai?action=chapter&slug=${slug}`
                                }]
                            }]
                        }
                    }
                }, 200 as any);
        }

        if (action === 'chapter') {
            if (!slug) return c.json({ error: 'Missing slug/id' }, 400 as any);

            const url = `https://nhentai.net/g/${slug}/`;
            const res = await axios.get(url, { headers });
            const $ = cheerio.load(res.data);

            const images: string[] = [];

            // Check gallery id from thumbnail URL to deduce full image URL.
            // Thumbnails: t.nhentai.net/galleries/MEDIA_ID/1t.jpg
            // Full imgs: i.nhentai.net/galleries/MEDIA_ID/1.jpg

            $('#thumbnail-container .thumb-container a img').each((i, el) => {
                let thumbSrc = $(el).attr('data-src') || $(el).attr('src');
                if (thumbSrc) {
                    // Extract media ID and extension
                    const match = thumbSrc.match(/t\S?\.nhentai\.net\/galleries\/(\d+)\/(\d+)t?\.(\w+)/);
                    if (match) {
                        const mediaId = match[1];
                        const pageNum = match[2];
                        const ext = match[3];

                        // Map thumb extensions to full extensions if needed (usually jpg/png)
                        const fullExt = ext === 'jpg' || ext === 'png' || ext === 'gif' || ext === 'webp' ? ext : 'jpg';

                        images.push(`https://i.nhentai.net/galleries/${mediaId}/${pageNum}.${fullExt}`);
                    } else if (thumbSrc.includes('nhentai.net/galleries/')) {
                        // generic fallback rewrite
                        let fullSrc = thumbSrc.replace('t.nhentai.net', 'i.nhentai.net')
                            .replace('t2.nhentai.net', 'i.nhentai.net')
                            .replace('t3.nhentai.net', 'i.nhentai.net')
                            .replace('t4.nhentai.net', 'i.nhentai.net')
                            .replace('t5.nhentai.net', 'i.nhentai.net')
                            .replace('t6.nhentai.net', 'i.nhentai.net')
                            .replace('t7.nhentai.net', 'i.nhentai.net');

                        fullSrc = fullSrc.replace(/(\d+)t\.(\w+)$/, '$1.$2'); // replace 1t.jpg with 1.jpg
                        if (fullSrc.startsWith('//')) fullSrc = 'https:' + fullSrc;
                        images.push(fullSrc);
                    }
                }
            });

            return c.json({
                    status: 'success',
                    data: {
                        domain_cdn: '',
                        item: {
                            chapter_image: images.map(img => ({ image_file: img }))
                        }
                    }
                }, 200 as any);
        }



        return c.json({ error: 'Unsupported action' }, 400 as any);
    } catch (error: any) {
        console.error('Nhentai API Error:', error.message);
        return c.json({ error: 'Failed to scrape nhentai. You may be blocked by Cloudflare.', details: error.message }, 500 as any);
    }
});

export default nhentai;
