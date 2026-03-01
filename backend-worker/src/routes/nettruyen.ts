import { Hono } from 'hono';
import { Env } from '../index';
import axios from 'axios';
import * as cheerio from 'cheerio';

// Domain failover list — read from env, fallback to defaults
const getDomains = (env: Env): string[] => {
    const envDomains = env.NETTRUYEN_DOMAINS;
    if (envDomains) {
        return envDomains.split(',').map(d => d.trim()).filter(Boolean);
    }
    return ['nettruyen4s.com', 'nettruyenar.com', 'nettruyenviet1.com'];
};

const makeAbsoluteUrl = (url: string, domain: string): string => {
    if (!url) return '';
    url = url.trim();

    // The Nettruyen backend sometimes renders broken HTML like: src="https://nettruyen4s.com/https://ntcdn..."
    const domainPrefix = `https://${domain}/https`;
    if (url.startsWith(domainPrefix)) {
        url = url.substring(`https://${domain}/`.length);
    } else if (url.startsWith(`http://${domain}/https`)) {
        url = url.substring(`http://${domain}/`.length);
    }

    // Some scraped thumbnails erroneously begin with /https:// or //https://
    if (/^\/+https?:/.test(url)) {
        url = url.replace(/^\/+/, '');
    }

    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    if (url.startsWith('//')) return 'https:' + url;
    if (url.startsWith('/')) return `https://${domain}${url}`;
    return `https://${domain}/${url}`;
};

// Auto-detect the comic path prefix for a domain.
// Some domains use /manga/slug, others use /truyen-tranh/slug.
// We probe the homepage to detect which path is used.
const domainPathCache = new Map<string, string>();

const detectComicPath = async (domain: string, headers: Record<string, string>): Promise<string> => {
    const cached = domainPathCache.get(domain);
    if (cached) return cached;

    try {
        const res = await axios.get(`https://${domain}/`, {
            headers: { ...headers, Referer: `https://${domain}/` },
            timeout: 8000,
        });
        const html: string = res.data;
        // Check which path format appears in the homepage links
        if (html.includes('/truyen-tranh/')) {
            domainPathCache.set(domain, 'truyen-tranh');
            return 'truyen-tranh';
        }
        if (html.includes('/manga/')) {
            domainPathCache.set(domain, 'manga');
            return 'manga';
        }
    } catch {
        // ignore detection errors
    }
    // Default fallback
    domainPathCache.set(domain, 'truyen-tranh');
    return 'truyen-tranh';
};

// Extract the comic slug from a full href, handling both /manga/ and /truyen-tranh/ prefixes
const extractSlug = (href: string): string => {
    // Match /manga/slug or /truyen-tranh/slug
    const match = href.match(/\/(?:manga|truyen-tranh)\/([^/?#]+)/);
    return match ? match[1] : '';
};

// Extract the chapter part from a full href
const extractChapterSlug = (href: string): string => {
    // Match /manga/comic-slug/chapter-slug or /truyen-tranh/comic-slug/chapter-slug
    const match = href.match(/\/(?:manga|truyen-tranh)\/[^/]+\/([^/?#]+)/);
    return match ? match[1] : '';
};

// Try fetching from each domain until one succeeds.
// Returns the HTML, the working domain, and the comic path prefix for that domain.
const fetchWithFailover = async (
    env: Env,
    pathBuilder: (comicPath: string) => string,
    headers: Record<string, string>,
    validator?: ($: any) => boolean
): Promise<{ data: string; domain: string; comicPath: string }> => {
    const domains = getDomains(env);
    let lastError: any = null;

    for (const domain of domains) {
        try {
            const comicPath = await detectComicPath(domain, headers);
            const path = pathBuilder(comicPath);
            const url = `https://${domain}${path}`;
            const res = await axios.get(url, {
                headers: { ...headers, Referer: `https://${domain}/` },
                timeout: 10000,
            });
            if (validator) {
                const $ = cheerio.load(res.data);
                if (!validator($)) throw new Error('Validation failed');
            }
            return { data: res.data, domain, comicPath };
        } catch (err: any) {
            lastError = err;
            console.warn(`Nettruyen domain ${domain} failed: ${err.message}`);
            continue;
        }
    }
    throw lastError || new Error('All nettruyen domains failed');
};

// Simple variant for fixed paths (no comicPath needed)
const fetchFixedPath = async (
    env: Env,
    path: string,
    headers: Record<string, string>,
    validator?: ($: any) => boolean
): Promise<{ data: string; domain: string }> => {
    const domains = getDomains(env);
    let lastError: any = null;

    for (const domain of domains) {
        try {
            const url = `https://${domain}${path}`;
            const res = await axios.get(url, {
                headers: { ...headers, Referer: `https://${domain}/` },
                timeout: 10000,
            });
            if (validator) {
                const $ = cheerio.load(res.data);
                if (!validator($)) throw new Error('Validation failed');
            }
            return { data: res.data, domain };
        } catch (err: any) {
            lastError = err;
            console.warn(`Nettruyen domain ${domain} failed: ${err.message}`);
            continue;
        }
    }
    throw lastError || new Error('All nettruyen domains failed');
};

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const nettruyen = new Hono<{ Bindings: Env }>();

nettruyen.get('/', async (c) => {
    const event = { queryStringParameters: c.req.query(), path: c.req.path };
    const { action, page = '1', slug = '', q = '', chapter = '', time = 'all' } = event.queryStringParameters || {};
    const headers = { 'User-Agent': UA };

    const fetchPathsFallbacks = async (env: Env, paths: string[], checkValidator: boolean = true) => {
        const validator = checkValidator ? ($: any) => {
            const title = $('title').text() || '';
            if (title.includes('404')) return false;

            // If there is no .items wrapper at all, it's a structural 404 for this domain
            if ($('.items').length === 0) return false;

            if (page === '1') return true;
            const activePage = parseInt($('ul.pagination li.active a, .pagination .current').text().trim());
            if (!isNaN(activePage) && activePage === 1) return false;
            return true;
        } : undefined;

        let lastError;
        for (const path of paths) {
            try {
                return await fetchWithFailover(env, () => path, headers, validator);
            } catch (err) {
                lastError = err;
            }
        }
        throw lastError || new Error('All fallbacks failed');
    };

    const parseItemList = (html: string, domain: string, pageStr: string) => {
        const $ = cheerio.load(html);
        const items: any[] = [];
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

        return c.json({
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
    };

    try {
        // ── LATEST ──
        if (action === 'latest') {
            const paths = page === '1'
                ? [`/danh-sach-truyen?status=-1&sort=15`, `/danh-sach-truyen/?status=-1&sort=15`]
                : [`/danh-sach-truyen?status=-1&sort=15&page=${page}`, `/danh-sach-truyen/${page}?status=-1&sort=15`];
            const { data: html, domain } = await fetchPathsFallbacks(c.env, paths);
            return parseItemList(html, domain, page);
        }

        // ── POPULAR ──
        if (action === 'popular') {
            let sortParam = 'views';
            let altSort = '10';
            if (time === 'day') { sortParam = 'views_day'; altSort = '13'; }
            else if (time === 'week') { sortParam = 'views_week'; altSort = '12'; }
            else if (time === 'month') { sortParam = 'views_month'; altSort = '11'; }

            const paths = page === '1'
                ? [`/danh-sach-truyen?sort=${sortParam}`, `/tim-truyen?status=-1&sort=${altSort}`]
                : [
                    `/danh-sach-truyen?sort=${sortParam}&page=${page}`,
                    `/danh-sach-truyen/${page}?sort=${sortParam}`,
                    `/tim-truyen?status=-1&sort=${altSort}&page=${page}`,
                    `/tim-truyen/${page}?status=-1&sort=${altSort}`
                ];
            const { data: html, domain } = await fetchPathsFallbacks(c.env, paths);
            return parseItemList(html, domain, page);
        }

        // ── COMPLETED ──
        if (action === 'completed') {
            const paths = page === '1'
                ? [`/tim-truyen?status=2`, `/truyen-hoan-thanh`]
                : [
                    `/tim-truyen?status=2&page=${page}`,
                    `/tim-truyen/${page}?status=2`,
                    `/truyen-hoan-thanh?page=${page}`,
                    `/truyen-hoan-thanh/${page}/`
                ];
            const { data: html, domain } = await fetchPathsFallbacks(c.env, paths);
            return parseItemList(html, domain, page);
        }

        // ── SEARCH ──
        if (action === 'search') {
            const encodedQuery = encodeURIComponent(q as string);
            const paths = [
                `/tim-truyen?keyword=${encodedQuery}&page=${page}`,
                `/tim-truyen/${page}?keyword=${encodedQuery}`,
                `/search?keyword=${encodedQuery}&page=${page}`,
                `/search/${page}?keyword=${encodedQuery}`
            ];
            const { data: html, domain } = await fetchPathsFallbacks(c.env, paths);
            return parseItemList(html, domain, page);
        }

        // ── GENRE SEARCH ──
        if (action === 'genre') {
            if (!slug) return c.json({ error: 'Missing slug' }, 200 as any);
            const paths = [
                `/the-loai/${slug}?page=${page}`,
                `/the-loai/${slug}/${page}/`,
                `/tim-truyen/${slug}?page=${page}`,
                `/tim-truyen/${slug}/${page}/`
            ];
            const { data: html, domain } = await fetchPathsFallbacks(c.env, paths);
            return parseItemList(html, domain, page);
        }

        // ── DETAIL ──
        if (action === 'detail') {
            if (!slug) return c.json({ error: 'Missing slug' }, 400 as any);

            // Use dynamic comicPath: /manga/slug OR /truyen-tranh/slug
            const { data: html, comicPath, domain } = await fetchWithFailover(c.env, 
                (cp) => `/${cp}/${slug}`,
                headers
            );
            const $ = cheerio.load(html);

            const title = $('h1.title-detail').text().trim() || $('article h1').text().trim();
            const altTitle = $('h2.other-name').text().trim();
            const author = $('.author .col-xs-8 a, .author p:last-child').first().text().trim() || 'Đang cập nhật';
            const status = $('.status .col-xs-8, .status p:last-child').first().text().trim() || '';
            const content = $('.detail-content p, .shortened').text().trim() || '';

            let thumb = $('#item-detail .col-image img').attr('src')
                || $('#item-detail .col-image img').attr('data-original')
                || $('meta[property="og:image"]').attr('content')
                || '';
            thumb = makeAbsoluteUrl(thumb, domain);

            // Categories / genres
            const categories: { name: string; slug: string }[] = [];
            $('.kind .col-xs-8 a, .kind p:last-child a').each((_, el) => {
                const name = $(el).text().trim();
                const href = $(el).attr('href') || '';
                const catSlug = href.replace(/^.*\/the-loai\//, '').replace(/\/$/, '');
                if (name) categories.push({ name, slug: catSlug });
            });

            // Chapters — extract from both /manga/ and /truyen-tranh/ links
            const chapters: { chapter_name: string; chapter_api_data: string; update_time?: string }[] = [];
            $('nav ul .chapter a, .list-chapter li .chapter a, #nt_listchapter nav ul li .chapter a').each((_, el) => {
                const chName = $(el).text().trim();
                const href = $(el).attr('href') || '';
                const chSlug = extractChapterSlug(href) || chName;

                // Extract update time from the adjacent column (typically .col-xs-4 text-center small)
                let updateTime = $(el).closest('li, .row').find('.col-xs-4').text().trim();
                if (!updateTime) {
                    // Fallback to the first .small element (date) rather than the last (views)
                    updateTime = $(el).closest('li, .row').find('.small').first().text().trim();
                }

                // Sometimes the date is just the text node next to it, ensure it's not empty
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

            return c.json({
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
        }

        // ── CHAPTER (images) ──
        if (action === 'chapter') {
            if (!slug || !chapter) {
                return c.json({ error: 'Missing slug or chapter' }, 400 as any);
            }

            // Use dynamic comicPath: /manga/slug/chapter OR /truyen-tranh/slug/chapter
            const { data: html, domain } = await fetchWithFailover(c.env, 
                (cp) => `/${cp}/${slug}/${chapter}`,
                headers
            );
            const $ = cheerio.load(html);

            const images: string[] = [];
            $('.reading-detail .page-chapter img, .chapter-content .page-chapter img').each((_, el) => {
                let src = $(el).attr('data-original')
                    || $(el).attr('data-src')
                    || $(el).attr('src')
                    || '';

                src = makeAbsoluteUrl(src, domain);
                if (src && !src.includes('logo') && !src.includes('ads')) {
                    images.push(src);
                }
            });

            return c.json({
                status: 'success',
                data: {
                    domain_cdn: '',
                    item: {
                        chapter_image: images.map(img => ({ image_file: img })),
                    },
                },
            }, 200 as any);
        }

        // ── CATEGORIES ──
        if (action === 'categories') {
            const { data: html } = await fetchFixedPath(c.env, '/', headers);
            const $ = cheerio.load(html);

            const categories: { name: string; slug: string }[] = [];
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

            return c.json({ status: 'success', data: { items: categories } }, 200 as any);
        }

        return c.json({ error: 'Unsupported action. Use: latest, popular, search, detail, chapter, categories' }, 400 as any);
    } catch (error: any) {
        console.error('Nettruyen API Error:', error.message);
        return c.json({
            error: 'Failed to scrape nettruyen. All domains may be down.',
            details: error.message,
        }, 500 as any);
    }
});

export default nettruyen;
