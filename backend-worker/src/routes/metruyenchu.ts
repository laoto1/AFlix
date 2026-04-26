import { Hono } from 'hono';
import { Env } from '../index';
import axios from 'axios';
import * as cheerio from 'cheerio';

const DOMAIN = 'https://metruyenchu.com.vn';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// In-memory cache for covers to prevent hitting MTC detail pages too often
const coverCache = new Map<string, string>();

// Removed duplicate coverCache
const metruyenchu = new Hono<{ Bindings: Env }>();







// Helper to get numeric ID for a novel slug bypassing Cloudflare WAF via Jina Reader
const slugToIdCache = new Map<string, string>();
async function getNumericIdForSlug(slug: string): Promise<string> {
    if (/^\d+$/.test(slug)) return slug; // Already numeric
    if (slugToIdCache.has(slug)) return slugToIdCache.get(slug)!;

    try {
        const url = `https://api.codetabs.com/v1/proxy?quest=${DOMAIN}/${slug}`;
        const res = await fetch(url, { headers: { 'User-Agent': UA } });
        const data = await res.text();
        const match = data.match(/<input[^>]+name="bid"[^>]+value="(\d+)"/i);
        if (match && match[1]) {
            slugToIdCache.set(slug, match[1]);
            return match[1];
        }
    } catch (e) {
        console.error("Error getting numeric ID for slug:", e);
    }
    return '';
}


async function fetchThumbnail(slug: string): Promise<string> {
    if (coverCache.has(slug)) return coverCache.get(slug)!;
    try {
        const url = `https://api.codetabs.com/v1/proxy?quest=${DOMAIN}/${slug}`;
        const res = await fetch(url, { headers: { 'User-Agent': UA } });
        const html = await res.text();
        const coverMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i);
        if (coverMatch && coverMatch[1]) {
            const cover = coverMatch[1];
            coverCache.set(slug, cover);
            return cover;
        }
    } catch (e) {
        console.error("Error fetching cover for", slug, e);
    }
    return '';
}

metruyenchu.get('/', async (c) => {
    const { action, page = '1', keyword = '', bookid = '', chapterId = '', category = '' } = c.req.query() || {};

    try {
        if (action === 'search' || action === 'listing') {
            let url = '';
            const pageNum = parseInt(page as string) || 1;


            let listPath = '';
            if (action === 'search' && keyword) {
                // metruyenchu search pagination: /tim-kiem?tu-khoa=...&page=...
                url = `${DOMAIN}/tim-kiem?tu-khoa=${encodeURIComponent(keyword as string)}`;
                if (pageNum > 1) url += `&page=${pageNum}`;
            } else if (action === 'listing') {
                const tab = c.req.query('tab') || 'latest';
                listPath = 'truyen-moi-cap-nhat';
                if (tab === 'random') listPath = 'truyen-hot';
                else if (tab === 'completed') listPath = 'truyen-full';
                else if (tab.startsWith('truyen-')) listPath = tab;

                if (category) {
                    url = `${DOMAIN}/the-loai/${category}`;
                    if (pageNum > 1) url += `?page=${pageNum}`;
                } else if (listPath === 'truyen-moi-cap-nhat') {
                    url = `${DOMAIN}`; // Homepage is latest
                    if (pageNum > 1) url += `?page=${pageNum}`;
                } else {
                    url = `${DOMAIN}/danh-sach/${listPath}`;
                    if (pageNum > 1) url += `?page=${pageNum}`;
                }
            }

            if (!url) return c.json({ error: 'Missing keyword or category' }, 400 as any);

            const proxyUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`;
            const res = await fetch(proxyUrl, { headers: { 'User-Agent': UA } });
            const data = await res.text();
            const $ = cheerio.load(data);
            const items: any[] = [];

            if (listPath === 'truyen-moi-cap-nhat' && !category && pageNum === 1) {
                // Parse pre-existing covers from slide and full-book to save network requests
                const preloadedCovers = new Map<string, string>();
                $('a').each((_, el) => {
                    let href = $(el).attr('href') || '';
                    if (href.startsWith(DOMAIN)) href = href.replace(DOMAIN, '');
                    const slug = href.replace(/^\//, '');
                    const imgSrc = $(el).find('img').attr('src');
                    if (slug && imgSrc) {
                        preloadedCovers.set(slug, imgSrc.startsWith('http') ? imgSrc : `${DOMAIN}${imgSrc}`);
                    }
                });

                // Parse newly updated items from home page
                const pendingItems: any[] = [];
                $('.itemupdate').each((_, el) => {
                    const aTag = $(el).find('.iname h3 a');
                    const title = aTag.text().replace(/^> /, '').trim();
                    let href = aTag.attr('href') || '';
                    if (href.startsWith(DOMAIN)) href = href.replace(DOMAIN, '');
                    const slug = href.replace(/^\//, '');
                    
                    const chaptersCountText = $(el).find('.ichapter a').text().trim();
                    const chaptersCount = chaptersCountText.replace(/\D+/g, '');
                    const categories: string[] = [];
                    $(el).find('.icate a').each((_, catEl) => {
                        categories.push($(catEl).text().trim());
                    });
                    
                    if (slug && title) {
                        pendingItems.push({
                            id: slug,
                            name: title,
                            thumb_url: '',
                            author: '',
                            chapters_count: chaptersCount,
                            categories: categories,
                        });
                    }
                });
                // Fetch covers in parallel and preserve order
                const hydratedItems = await Promise.all(pendingItems.map(async (item) => {
                    if (preloadedCovers.has(item.id)) {
                        item.thumb_url = preloadedCovers.get(item.id);
                    } else {
                        item.thumb_url = await fetchThumbnail(item.id);
                    }
                    return item;
                }));
                items.push(...hydratedItems);

            } else {
                $('a.cover').each((_, el) => {
                    const parent = $(el).parent();
                    const title = parent.find('h3').text().trim() || parent.find('.truyen-title').text().trim();
                    let href = $(el).attr('href') || '';
                    if (href.startsWith(DOMAIN)) href = href.replace(DOMAIN, '');
                    const slug = href.replace(/^\//, '');
                    
                    const cover = $(el).find('img').attr('src') || '';
                    const author = parent.find('p.line:contains("Tác giả") a').text().trim() || 
                                   parent.find('.author').text().trim() || '';

                    let chaptersCount = parent.find('p.line:contains("Số chương")').text().replace('Số chương :', '').trim();
                    if (!chaptersCount) {
                        chaptersCount = parent.find('.chapter-count').text().replace(/\D+/g, '').trim();
                    }
                    
                    let viewCount = parent.find('p.line:contains("Lượt xem")').text().replace('Lượt xem :', '').trim();
                    if (!viewCount) viewCount = parent.find('.view-count').text().replace(/\D+/g, '').trim();

                    const categories: string[] = [];
                    parent.find('p.line:contains("Thể loại") a').each((_, catEl) => {
                        categories.push($(catEl).text().trim());
                    });

                    if (slug && title) {
                        items.push({
                            id: slug,
                            name: title,
                            thumb_url: cover.startsWith('http') ? cover : `${DOMAIN}${cover}`,
                            author: author,
                            chapters_count: chaptersCount,
                            view_count: viewCount,
                            categories: categories,
                        });
                    }
                });
            }

            return c.json({
                status: 'success',
                data: {
                    items: items,
                    pagination: {
                        currentPage: parseInt(page as string) || 1,
                        totalItems: items.length,
                    },
                },
            });
        }

        // ── DETAIL ──
        if (action === 'detail') {
            if (!bookid) return c.json({ error: 'Missing bookid' }, 400 as any);

            // Fetch via codetabs proxy to bypass Cloudflare and rate limits
            const url = `https://api.codetabs.com/v1/proxy?quest=${DOMAIN}/${bookid}`;
            const res = await fetch(url, { headers: { 'User-Agent': UA } });
            const data = await res.text();
            const $ = cheerio.load(data);

            const title = $('h1').text().trim() || $('h3').first().text().trim();
            const author = $('a[href*="tac-gia"]').first().text().trim() || $('.author').text().trim();
            const coverMatch = data.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i);
            const cover = coverMatch ? coverMatch[1] : ($('.book-info-pic img').attr('src') || '');
            const status = $('.label-status').text().trim() || 'Đang cập nhật';
            
            const categories: any[] = [];
            $('a[href*="the-loai"]').each((_, el) => {
                const name = $(el).text().trim();
                const href = $(el).attr('href') || '';
                const slug = href.split('/').pop() || name.toLowerCase().replace(/\s+/g, '-');
                categories.push({ name, slug });
            });

            let description = '';
            $('.bg-wrap').each((_, el) => {
                if ($(el).text().includes('THÔNG TIN TRUYỆN')) {
                    description = $(el).html() || '';
                }
            });
            if (!description) description = $('.desc').html() || '';

            let numericId = '';
            const bidInput = $('input[name="bid"]');
            if (bidInput.length) {
                numericId = bidInput.val() as string;
            } else {
                const htmlMatch = data.match(/<input[^>]+name="bid"[^>]+value="(\d+)"/i);
                if (htmlMatch) numericId = htmlMatch[1];
            }
            if (numericId) slugToIdCache.set(bookid as string, numericId);

            return c.json({
                status: 'success',
                data: {
                    id: bookid,
                    numericId: numericId || bookid,
                    name: title,
                    author,
                    status,
                    thumb_url: cover.startsWith('http') ? cover : `${DOMAIN}${cover}`, 
                    description, 
                    categories,
                },
            });
        }

        // ── CHAPTERS ──
        if (action === 'chapters') {
            if (!bookid) return c.json({ error: 'Missing bookid' }, 400 as any);

            const items: any[] = [];
            let targetNumericId = await getNumericIdForSlug(bookid as string);
            if (!targetNumericId) return c.json({ error: 'Cannot find numeric ID for chapters' }, 404 as any);

            try {
                let pageNum = parseInt(page as string) || 1;
                while (pageNum <= 50) {
                    const url = `${DOMAIN}/get/listchap/${targetNumericId}?page=${pageNum}`;
                    const resApi = await fetch(url, { headers: { 'User-Agent': UA } });
                    const jsonData = await resApi.json() as any;
                    if (!jsonData || !jsonData.data) break;
                    
                    const html = jsonData.data;
                    const $ = cheerio.load(html);
                    const links = $('a[href*="/chuong-"]');
                    if (links.length === 0) break;

                    links.each((_, el) => {
                        const href = $(el).attr('href') || '';
                        const name = $(el).text().trim();
                        const chMatch = href.match(/chuong-\d+-[a-zA-Z0-9_!]+/);
                        let chId = chMatch ? chMatch[0] : href.split('/').pop() || '';
                        items.push({ id: chId, name: name });
                    });
                    
                    if (!html.includes('Chương tiếp') && !html.includes('class="next"')) break;
                    pageNum++;
                }
            } catch (err) {
                console.error("Error fetching chapters:", err);
            }

            return c.json({ status: 'success', data: { chapters: items } });
        }

        // ── CHAPTER CONTENT ──
        if (action === 'chapter') {
            if (!bookid || !chapterId) {
                return c.json({ error: 'Missing bookid or chapterId' }, 400 as any);
            }

            const url = `https://api.codetabs.com/v1/proxy?quest=${DOMAIN}/${bookid}/${chapterId}`;
            const res = await fetch(url, { headers: { 'User-Agent': UA } });
            const data = await res.text();
            const $ = cheerio.load(data);

            const chapterName = $('.current-chapter').text().trim() || $('h2').first().text().trim();
            const bookName = $('.current-book').text().trim() || $('h1').first().text().trim();
            const contentHTML = $('.truyen').html() || '';

            return c.json({
                status: 'success',
                jinaStatus: res.status,
                preview: data.substring(0, 300),
                data: { 
                    id: chapterId, 
                    name: chapterName, 
                    bookName: bookName, 
                    content: contentHTML 
                },
            });
        }

        return c.json({ error: 'Unsupported action' }, 400 as any);

    } catch (error: any) {
        console.error('MeTruyenChu API Error:', error.message);
        return c.json({ error: 'Failed to fetch from metruyenchu', details: error.message }, 500 as any);
    }
});

export default metruyenchu;
