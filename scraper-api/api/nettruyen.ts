const express = require('express');
import axios from 'axios';
import * as cheerio from 'cheerio';

// ── Multi-Domain Failover ──
const DEFAULT_DOMAINS = [
    'nettruyen4s.com',
    'nettruyenar.com',
    'nettruyenviet1.com',
    'nettruyen.org.uk',
    'nettruyen.africa',
    'nettruyen.work',
];

const getDomains = (): string[] => {
    const envDomains = process.env.NETTRUYEN_DOMAINS;
    if (envDomains) {
        const list = envDomains.split(',').map(d => d.trim()).filter(Boolean);
        if (list.length > 0) return list;
    }
    return DEFAULT_DOMAINS;
};

// Cache the last working domain for 30 minutes to avoid wasted failover attempts
let cachedDomain: string | null = null;
let cachedDomainExpiry = 0;

const getOrderedDomains = (): string[] => {
    const domains = getDomains();
    if (cachedDomain && Date.now() < cachedDomainExpiry && domains.includes(cachedDomain)) {
        // Put cached working domain first, then the rest
        return [cachedDomain, ...domains.filter(d => d !== cachedDomain)];
    }
    return domains;
};

const setCachedDomain = (domain: string) => {
    cachedDomain = domain;
    cachedDomainExpiry = Date.now() + 30 * 60 * 1000; // 30 minutes
};

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const fetchPage = async (path: string, headers: any): Promise<{ html: string; domain: string }> => {
    const domains = getOrderedDomains();
    let lastError: any = null;

    for (const domain of domains) {
        try {
            const url = path.startsWith('http') ? path : `https://${domain}${path}`;
            const resp = await axios.get(url, {
                headers: { ...headers, Referer: `https://${domain}/` },
                timeout: 5000,
            });

            // Validate: response must contain HTML (not a WAF block page or empty)
            const html = resp.data;
            if (typeof html === 'string' && html.length > 500 && html.includes('<')) {
                setCachedDomain(domain);
                return { html, domain };
            }
            // Invalid response, try next domain
            lastError = new Error(`Domain ${domain} returned invalid/blocked response (${typeof html === 'string' ? html.length : 0} bytes)`);
        } catch (err: any) {
            lastError = err;
            console.log(`[Nettruyen] Domain ${domain} failed: ${err.message}`);
            // Continue to next domain
        }
    }

    throw lastError || new Error('All Nettruyen domains exhausted');
};

const makeAbsoluteUrl = (url: string, domain: string): string => {
    if (!url) return '';
    url = url.trim();

    const domainPrefix = `https://${domain}/https`;
    if (url.startsWith(domainPrefix)) {
        url = url.substring(`https://${domain}/`.length);
    } else if (url.startsWith(`http://${domain}/https`)) {
        url = url.substring(`http://${domain}/`.length);
    }

    if (/^\/+https?:/.test(url)) {
        url = url.replace(/^\/+/, '');
    }

    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    if (url.startsWith('//')) return 'https:' + url;
    if (url.startsWith('/')) return `https://${domain}${url}`;
    return `https://${domain}/${url}`;
};

const extractSlug = (href: string): string => {
    const match = href.match(/\/(?:manga|truyen-tranh)\/([^/?#]+)/);
    return match ? match[1] : '';
};

const extractChapterSlug = (href: string): string => {
    const match = href.match(/\/(?:manga|truyen-tranh)\/[^/]+\/([^/?#]+)/);
    return match ? match[1] : '';
};

const parseItemList = (html, domain, pageStr) => {
    const $ = cheerio.load(html);
    const items = [];
    $('.items .item, .ModuleContent .items .item').each((_, el) => {
        const linkEl = $(el).find('.image a').first();
        const href = linkEl.attr('href') || '';
        const comicSlug = extractSlug(href);
        const title = linkEl.attr('title') || $(el).find('figcaption h3 a, .jtip').text().trim();
        let thumb = $(el).find('.image img').attr('data-original')
            || $(el).find('.image img').attr('src')
            || $(el).find('.image img').attr('data-src')
            || '';

        thumb = makeAbsoluteUrl(thumb, domain);
        const latestChapterText = $(el).find('.comic-item li:first-child a, .chapter a').first().text().trim();

        if (comicSlug && title) {
            items.push({
                _id: comicSlug,
                name: title,
                slug: comicSlug,
                thumb_url: thumb,
                chaptersLatest: latestChapterText ? [{ chapter_name: latestChapterText }] : [],
            });
        }
    });

    let totalPages = 1;
    const hiddenText = $('.pagination .hidden').text();
    if (hiddenText) {
        const match = hiddenText.match(/(?:Page|Trang)\s+\d+\s*\/\s*(\d+)/i);
        if (match) totalPages = parseInt(match[1]);
    }
    if (totalPages === 1) {
        $('ul.pagination li a').each((_, el) => {
            const num = parseInt($(el).text().trim());
            if (!isNaN(num) && num > totalPages) totalPages = num;
        });
    }

    return {
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
    };
};

const nettruyen = express.Router();

nettruyen.get('/', async (req, res) => {
    const { action, page = '1', slug = '', q = '', chapter = '', time = 'all' } = req.query || {};
    const headers = { 'User-Agent': UA };

    try {
        // ── LATEST ──
        if (action === 'latest') {
            const path = page === '1'
                ? `/search?sort=15`
                : `/search?sort=15&page=${page}`;
            const { html, domain } = await fetchPage(path, headers);
            return res.json(parseItemList(html, domain, page));
        }

        // ── POPULAR ──
        if (action === 'popular') {
            let sortParam = 'views';
            if (time === 'day') sortParam = 'views_day';
            else if (time === 'week') sortParam = 'views_week';
            else if (time === 'month') sortParam = 'views_month';

            const path = page === '1'
                ? `/search?sort=${sortParam}`
                : `/search?sort=${sortParam}&page=${page}`;
            const { html, domain } = await fetchPage(path, headers);
            return res.json(parseItemList(html, domain, page));
        }

        // ── COMPLETED ──
        if (action === 'completed') {
            const path = page === '1'
                ? `/search?status=2`
                : `/search?status=2&page=${page}`;
            const { html, domain } = await fetchPage(path, headers);
            return res.json(parseItemList(html, domain, page));
        }

        // ── SEARCH ──
        if (action === 'search') {
            const encodedQuery = encodeURIComponent(q as string);
            const path = `/search?keyword=${encodedQuery}&page=${page}`;
            const { html, domain } = await fetchPage(path, headers);
            return res.json(parseItemList(html, domain, page));
        }

        // ── GENRE SEARCH ──
        if (action === 'genre') {
            if (!slug) return res.json({ error: 'Missing slug' });
            const path = `/the-loai/${slug}?page=${page}`;
            const { html, domain } = await fetchPage(path, headers);
            return res.json(parseItemList(html, domain, page));
        }

        // ── DETAIL ──
        if (action === 'detail') {
            if (!slug) return res.status(400).json({ error: 'Missing slug' });

            const { html: detailHtml, domain: detailDomain } = await fetchPage(`/manga/${slug}`, headers);
            const $ = cheerio.load(detailHtml);

            const title = $('h1.title-detail').text().trim() || $('article h1').text().trim();
            const altTitle = $('h2.other-name').text().trim();
            const author = $('.author .col-xs-8 a, .author p:last-child').first().text().trim() || 'Đang cập nhật';
            const status = $('.status .col-xs-8, .status p:last-child').first().text().trim() || '';
            const content = $('.detail-content p, .shortened').text().trim() || '';

            let thumb = $('#item-detail .col-image img').attr('src')
                || $('#item-detail .col-image img').attr('data-original')
                || $('meta[property="og:image"]').attr('content')
                || '';
            thumb = makeAbsoluteUrl(thumb, detailDomain);

            const categories = [];
            $('.kind .col-xs-8 a, .kind p:last-child a').each((_, el) => {
                const name = $(el).text().trim();
                const href = $(el).attr('href') || '';
                const catSlug = href.replace(/^.*\/the-loai\//, '').replace(/\/$/, '');
                if (name) categories.push({ name, slug: catSlug });
            });

            const chapters = [];
            $('nav ul .chapter a, .list-chapter li .chapter a, #nt_listchapter nav ul li .chapter a').each((_, el) => {
                const chName = $(el).text().trim();
                const href = $(el).attr('href') || '';
                const chSlug = extractChapterSlug(href) || chName;

                let updateTime = $(el).closest('li, .row').find('.col-xs-4').text().trim();
                if (!updateTime) {
                    updateTime = $(el).closest('li, .row').find('.small').first().text().trim();
                }
                if (!updateTime || updateTime === chName) {
                    updateTime = '';
                }

                if (chName) {
                    chapters.push({
                        chapter_name: chName,
                        update_time: updateTime,
                        chapter_api_data: `/api/nettruyen?action=chapter&slug=${slug}&chapter=${encodeURIComponent(chSlug)}`,
                    });
                }
            });

            return res.json({
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
            });
        }

        // ── CHAPTER (images) ──
        if (action === 'chapter') {
            if (!slug || !chapter) {
                return res.status(400).json({ error: 'Missing slug or chapter' });
            }

            const { html: chapterHtml, domain: chapterDomain } = await fetchPage(`/manga/${slug}/${chapter}`, headers);
            const $ = cheerio.load(chapterHtml);

            const images = [];
            $('.reading-detail .page-chapter img, .chapter-content .page-chapter img').each((_, el) => {
                let src = $(el).attr('data-original')
                    || $(el).attr('data-src')
                    || $(el).attr('src')
                    || '';

                src = makeAbsoluteUrl(src, chapterDomain);
                if (src && !src.includes('logo') && !src.includes('ads')) {
                    images.push(src);
                }
            });

            return res.json({
                status: 'success',
                data: {
                    domain_cdn: '',
                    item: {
                        chapter_image: images.map(img => ({ image_file: img })),
                    },
                },
            });
        }

        // ── CATEGORIES ──
        if (action === 'categories') {
            const { html: catHtml } = await fetchPage('/', headers);
            const $ = cheerio.load(catHtml);

            const categories = [];
            $('.dropdown-menu .clearfix li a, .megamenu li a').each((_, el) => {
                const href = $(el).attr('href') || '';
                const match = href.match(/\/the-loai\/([^/?]+)/);
                if (match) {
                    categories.push({
                        name: $(el).text().trim(),
                        slug: match[1],
                    });
                }
            });

            return res.json({ status: 'success', data: { items: categories } });
        }

        return res.status(400).json({ error: 'Unsupported action. Use: latest, popular, search, detail, chapter, categories' });
    } catch (error) {
        console.error('Nettruyen API Error:', error.message);
        return res.status(500).json({
            error: 'Failed to scrape nettruyen. All domains may be down.',
            details: error.message,
        });
    }
});
module.exports = nettruyen;