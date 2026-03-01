const express = require('express');
import axios from 'axios';
import * as cheerio from 'cheerio';

const nhentai = express.Router();

nhentai.get('/', async (req, res) => {
    const { action, page = '1', slug = '', q = '', sort = '' } = req.query || {};

    try {
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        };

        if (action === 'latest' || action === 'completed' || action === 'popular') {
            let url;
            if (action === 'popular') {
                const popularSort = sort || 'popular-today';
                url = `https://nhentai.net/search/?q=""&sort=${popularSort}&page=${page}`;
            } else {
                url = `https://nhentai.net/?page=${page}`;
            }
            const resp = await axios.get(url, { headers });
            const $ = cheerio.load(resp.data);

            const items = [];
            let skipped = 0;
            const skipCount = (action !== 'popular' && parseInt(page as string) === 1) ? 5 : 0;
            $('.gallery').each((_, el) => {
                const id = $(el).find('a').attr('href')?.split('/')[2];
                const title = $(el).find('.caption').text();
                const thumb = $(el).find('img').attr('data-src') || $(el).find('img').attr('src');

                if (id && title && thumb) {
                    if (skipped < skipCount) {
                        skipped++;
                        return;
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

            return res.json({
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
            });
        }

        if (action === 'search') {
            const queryUrl = new URL('https://nhentai.net/search/');
            queryUrl.searchParams.set('q', q as string);
            queryUrl.searchParams.set('page', page as string);
            if (sort) queryUrl.searchParams.set('sort', sort as string);

            const resp = await axios.get(queryUrl.toString(), { headers });
            const $ = cheerio.load(resp.data);

            const items = [];
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
                if ($('.pagination').length > 0) {
                    const lastPaginationText = $('.pagination .page').last().text();
                    if (lastPaginationText) {
                        totalPages = parseInt(lastPaginationText);
                    }
                }
            }

            return res.json({
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
            });
        }

        if (action === 'detail') {
            if (!slug) return res.status(400).json({ error: 'Missing slug/id' });

            const url = `https://nhentai.net/g/${slug}/`;
            const resp = await axios.get(url, { headers });
            const $ = cheerio.load(resp.data);

            const title = $('#info h1').text();
            const originalTitle = $('#info h2').text();

            let thumb_url = $('#cover img').attr('data-src') || $('#cover img').attr('src');
            if (thumb_url && thumb_url.startsWith('//')) thumb_url = 'https:' + thumb_url;

            const tagsText = [];

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

            const authors = [];
            $('.tag-container:contains("Artists") .name').each((_, el) => {
                authors.push($(el).text());
            });

            $('.tag-container:contains("Groups") .name').each((_, el) => {
                authors.push($(el).text());
            });
            
            const uploadedAt = $('time').text() || $('time').attr('datetime') || '';

            const content = `Pages: ${pages} | Original Title: ${originalTitle}`;

            return res.json({
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
                                chapter_api_data: `/api/nhentai?action=chapter&slug=${slug}`
                            }]
                        }]
                    }
                }
            });
        }

        if (action === 'chapter') {
            if (!slug) return res.status(400).json({ error: 'Missing slug/id' });

            const url = `https://nhentai.net/g/${slug}/`;
            const resp = await axios.get(url, { headers });
            const $ = cheerio.load(resp.data);

            const images = [];

            $('#thumbnail-container .thumb-container a img').each((i, el) => {
                let thumbSrc = $(el).attr('data-src') || $(el).attr('src');
                if (thumbSrc) {
                    const match = thumbSrc.match(/t\S?\.nhentai\.net\/galleries\/(\d+)\/(\d+)t?\.(\w+)/);
                    if (match) {
                        const mediaId = match[1];
                        const pageNum = match[2];
                        const ext = match[3];
                        const fullExt = ext === 'jpg' || ext === 'png' || ext === 'gif' || ext === 'webp' ? ext : 'jpg';
                        images.push(`https://i.nhentai.net/galleries/${mediaId}/${pageNum}.${fullExt}`);
                    } else if (thumbSrc.includes('nhentai.net/galleries/')) {
                        let fullSrc = thumbSrc.replace('t.nhentai.net', 'i.nhentai.net')
                            .replace('t2.nhentai.net', 'i.nhentai.net')
                            .replace('t3.nhentai.net', 'i.nhentai.net')
                            .replace('t4.nhentai.net', 'i.nhentai.net')
                            .replace('t5.nhentai.net', 'i.nhentai.net')
                            .replace('t6.nhentai.net', 'i.nhentai.net')
                            .replace('t7.nhentai.net', 'i.nhentai.net');

                        fullSrc = fullSrc.replace(/(\d+)t\.(\w+)$/, '$1.$2');
                        if (fullSrc.startsWith('//')) fullSrc = 'https:' + fullSrc;
                        images.push(fullSrc);
                    }
                }
            });

            return res.json({
                status: 'success',
                data: {
                    domain_cdn: '',
                    item: {
                        chapter_image: images.map(img => ({ image_file: img }))
                    }
                }
            });
        }

        return res.status(400).json({ error: 'Unsupported action' });
    } catch (error) {
        console.error('Nhentai API Error:', error.message);
        return res.status(500).json({ error: 'Failed to scrape nhentai. You may be blocked by Cloudflare.', details: error.message });
    }
});
module.exports = nhentai;