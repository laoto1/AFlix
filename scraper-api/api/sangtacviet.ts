const express = require('express');
import axios from 'axios';
import * as cheerio from 'cheerio';

// ── SangTacViet Scraper API ──
const DOMAIN = 'http://14.225.254.182';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// Session cookie management
let sessionCookies: string[] = [];
let sessionExpiry = 0;

async function ensureSession(): Promise<string> {
    if (Date.now() < sessionExpiry && sessionCookies.length > 0) {
        return sessionCookies.join('; ');
    }
    try {
        const res = await axios.get(DOMAIN, {
            headers: { 'User-Agent': UA },
            maxRedirects: 5,
            validateStatus: () => true,
        });
        const setCookies = res.headers['set-cookie'];
        if (setCookies) {
            sessionCookies = setCookies.map((c: string) => c.split(';')[0]);
            sessionExpiry = Date.now() + 30 * 60 * 1000; // 30 min
        }
    } catch (e) {
        // ignore
    }
    return sessionCookies.join('; ');
}

async function fetchPage(path: string): Promise<string> {
    const cookie = await ensureSession();
    const url = path.startsWith('http') ? path : `${DOMAIN}${path}`;
    const res = await axios.get(url, {
        headers: {
            'User-Agent': UA,
            'Cookie': cookie,
            'Referer': DOMAIN,
        },
        timeout: 15000,
        responseType: 'text',
    });
    // Update cookies from response
    const setCookies = res.headers['set-cookie'];
    if (setCookies) {
        const newCookies = setCookies.map((c: string) => c.split(';')[0]);
        for (const nc of newCookies) {
            const key = nc.split('=')[0];
            sessionCookies = sessionCookies.filter(c => !c.startsWith(key + '='));
            sessionCookies.push(nc);
        }
    }
    return res.data;
}

async function ajaxPost(params: string, query: string = ''): Promise<string> {
    const cookie = await ensureSession();
    const url = `${DOMAIN}/index.php${query ? '?' + query : ''}`;
    const res = await axios.post(url, params, {
        headers: {
            'User-Agent': UA,
            'Cookie': cookie,
            'Referer': DOMAIN,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 15000,
        responseType: 'text',
    });
    // Update cookies
    const setCookies = res.headers['set-cookie'];
    if (setCookies) {
        const newCookies = setCookies.map((c: string) => c.split(';')[0]);
        for (const nc of newCookies) {
            const key = nc.split('=')[0];
            sessionCookies = sessionCookies.filter(c => !c.startsWith(key + '='));
            sessionCookies.push(nc);
        }
    }
    return res.data;
}

function extractNovelSlug(href: string): { host: string; bookid: string } | null {
    // URL format: /truyen/{host}/1/{bookid}/
    const match = href.match(/\/truyen\/([^/]+)\/\d+\/([^/]+)/);
    if (match) return { host: match[1], bookid: match[2] };
    return null;
}

function parseNovelListFromHtml(html: string): any[] {
    const $ = cheerio.load(html);
    const novels: any[] = [];

    // Find all links to novels: /truyen/{host}/1/{bookid}/
    $('a[href*="/truyen/"]').each((_, el) => {
        const $el = $(el);
        const href = $el.attr('href') || '';
        const slug = extractNovelSlug(href);
        if (!slug) return;

        // Get text content as title
        let title = $el.text().trim();
        if (!title || title.length < 2) return;
        // Skip navigation/footer links
        if (title.length > 200) return;

        // Avoid duplicates
        if (novels.find(n => n.bookid === slug.bookid && n.host === slug.host)) return;

        // Try to find cover from parent or sibling img
        let cover = '';
        const parentImg = $el.find('img').attr('src') || $el.parent().find('img').attr('src') || '';
        if (parentImg) cover = parentImg;

        novels.push({
            _id: `${slug.host}-${slug.bookid}`,
            name: title,
            host: slug.host,
            bookid: slug.bookid,
            slug: `${slug.host}/${slug.bookid}`,
            thumb_url: cover,
            chaptersLatest: [],
            category: [],
            updatedAt: '',
        });
    });

    return novels;
}

const sangtacviet = express.Router();

sangtacviet.get('/', async (req: any, res: any) => {
    const { action, page = '1', host = '', bookid = '', keyword = '', chapterId = '' } = req.query || {};

    try {
        // ── LATEST ──
        if (action === 'latest') {
            const pageNum = parseInt(page as string) || 1;
            const path = `/?find=&minc=0&sort=update&tag=&p=${pageNum - 1}`;
            const html = await fetchPage(path);
            const novels = parseNovelListFromHtml(html);

            return res.json({
                status: 'success',
                data: {
                    items: novels,
                    params: { pagination: { currentPage: pageNum } },
                },
            });
        }

        // ── SEARCH ──
        if (action === 'search') {
            if (!keyword) return res.status(400).json({ error: 'Missing keyword' });
            const path = `/?find=&findinname=${encodeURIComponent(keyword as string)}`;
            const html = await fetchPage(path);
            const novels = parseNovelListFromHtml(html);

            return res.json({
                status: 'success',
                data: {
                    items: novels,
                    params: { pagination: { currentPage: 1 } },
                },
            });
        }

        // ── DETAIL ──
        if (action === 'detail') {
            if (!host || !bookid) return res.status(400).json({ error: 'Missing host or bookid' });

            const path = `/truyen/${host}/1/${bookid}/`;
            const html = await fetchPage(path);
            const $ = cheerio.load(html);

            // Extract from OG meta tags
            const title = $('meta[property="og:novel:book_name"]').attr('content') || $('h1#book_name2').text().trim() || '';
            const author = $('meta[property="og:novel:author"]').attr('content') || '';
            const cover = $('meta[property="og:image"]').attr('content') || '';
            const status = $('meta[property="og:novel:status"]').attr('content') || '';
            const category = $('meta[property="og:novel:category"]').attr('content') || '';
            const updateTime = $('meta[property="og:novel:update_time"]').attr('content') || '';
            const description = $('meta[property="og:description"]').attr('content') || '';
            const originalName = $('#oriname').text().trim() || '';

            // Parse categories
            const categories = category.split(',').map(c => c.trim()).filter(Boolean).map(c => ({
                name: c,
                slug: c.toLowerCase().replace(/\s+/g, '-'),
            }));

            return res.json({
                status: 'success',
                data: {
                    item: {
                        _id: `${host}-${bookid}`,
                        name: title,
                        host,
                        bookid,
                        slug: `${host}/${bookid}`,
                        origin_name: originalName,
                        author,
                        status: status === 'Còn tiếp' ? 'ongoing' : status === 'Hoàn thành' ? 'completed' : status,
                        thumb_url: cover,
                        content: description,
                        category: categories,
                        updatedAt: updateTime,
                        chapters: [],
                        chapter_api_data: `/api/sangtacviet?action=chapters&host=${host}&bookid=${bookid}`,
                    },
                },
            });
        }

        // ── CHAPTERS (list) ──
        if (action === 'chapters') {
            if (!host || !bookid) return res.status(400).json({ error: 'Missing host or bookid' });

            // First ensure we have a session by visiting the novel page
            await fetchPage(`/truyen/${host}/1/${bookid}/`);

            // Then fetch chapter list via AJAX
            const query = `ngmar=chapterlist&h=${host}&bookid=${bookid}&sajax=getchapterlist`;
            const data = await ajaxPost(`sajax=getchapterlist&h=${host}&bookid=${bookid}`, query);

            // Try to parse as JSON
            let chapters: any[] = [];
            try {
                if (data && data.trim()) {
                    const parsed = JSON.parse(data);
                    // Parse chapter list from response
                    if (Array.isArray(parsed)) {
                        chapters = parsed.map((ch: any, idx: number) => ({
                            _id: ch.id || ch.cid || String(idx + 1),
                            name: ch.name || ch.n || `Chương ${idx + 1}`,
                            chapter_api_data: `/api/sangtacviet?action=chapter&host=${host}&bookid=${bookid}&chapterId=${ch.id || ch.cid || idx + 1}`,
                        }));
                    } else if (parsed.data && Array.isArray(parsed.data)) {
                        chapters = parsed.data.map((ch: any, idx: number) => ({
                            _id: ch.id || ch.cid || String(idx + 1),
                            name: ch.name || ch.n || `Chương ${idx + 1}`,
                            chapter_api_data: `/api/sangtacviet?action=chapter&host=${host}&bookid=${bookid}&chapterId=${ch.id || ch.cid || idx + 1}`,
                        }));
                    }
                }
            } catch (e) {
                // If AJAX fails, try scraping from the HTML page directly
                const html = await fetchPage(`/truyen/${host}/1/${bookid}/`);
                const $ = cheerio.load(html);

                // Try to extract chapter data from inline scripts
                const scripts = $('script').toArray();
                for (const script of scripts) {
                    const text = $(script).html() || '';
                    const match = text.match(/var\s+(?:chapterData|chaplist)\s*=\s*(\[[\s\S]*?\]);/);
                    if (match) {
                        try {
                            chapters = JSON.parse(match[1]).map((ch: any, idx: number) => ({
                                _id: ch.id || ch.cid || String(idx + 1),
                                name: ch.name || ch.n || `Chương ${idx + 1}`,
                                chapter_api_data: `/api/sangtacviet?action=chapter&host=${host}&bookid=${bookid}&chapterId=${ch.id || ch.cid || idx + 1}`,
                            }));
                        } catch (e2) { /* ignore */ }
                    }
                }

                // If still empty, generate generic chapters from the page title
                if (chapters.length === 0) {
                    const titleMatch = $('title').text().match(/(\d+)\s*chương/i) || $('title').text().match(/(\d+)\s*chuong/i);
                    const chapterCount = titleMatch ? parseInt(titleMatch[1]) : 0;
                    for (let i = 1; i <= chapterCount; i++) {
                        chapters.push({
                            _id: String(i),
                            name: `Chương ${i}`,
                            chapter_api_data: `/api/sangtacviet?action=chapter&host=${host}&bookid=${bookid}&chapterId=${i}`,
                        });
                    }
                }
            }

            return res.json({
                status: 'success',
                data: {
                    items: chapters,
                },
            });
        }

        // ── CHAPTER (content) ──
        if (action === 'chapter') {
            if (!host || !bookid || !chapterId) {
                return res.status(400).json({ error: 'Missing host, bookid, or chapterId' });
            }

            // Ensure session by visiting novel page first
            await fetchPage(`/truyen/${host}/1/${bookid}/`);

            // Fetch chapter content via AJAX
            const query = `bookid=${bookid}&h=${host}&c=${chapterId}&ngmar=readc&sajax=readchapter&sty=1`;
            const data = await ajaxPost(`sajax=readchapter`, query);

            let content = '';
            let chapterName = `Chương ${chapterId}`;
            let bookName = '';

            try {
                if (data && data.trim()) {
                    let jsonStr = data;
                    // Sometimes response has prefix before JSON
                    const jsonStart = data.indexOf('{"');
                    if (jsonStart > 0) jsonStr = data.substring(jsonStart);

                    const parsed = JSON.parse(jsonStr);
                    if (parsed.code === '0' || parsed.code === 0) {
                        content = parsed.content || parsed.c || '';
                        chapterName = parsed.chaptername || parsed.cn || chapterName;
                        bookName = parsed.bookname || parsed.bn || '';
                    }
                }
            } catch (e) {
                // If AJAX fails, try loading the chapter HTML page directly
                try {
                    const html = await fetchPage(`/truyen/${host}/1/${bookid}/${chapterId}/`);
                    const $ = cheerio.load(html);
                    content = $('#maincontent').html() || '';
                    chapterName = $('title').text().trim() || chapterName;
                } catch (e2) { /* ignore */ }
            }

            return res.json({
                status: 'success',
                data: {
                    item: {
                        _id: chapterId,
                        name: chapterName,
                        book_name: bookName,
                        content: content,
                    },
                },
            });
        }

        return res.status(400).json({
            error: 'Unsupported action. Use: latest, search, detail, chapters, chapter',
        });

    } catch (error: any) {
        console.error('SangTacViet API Error:', error.message);
        return res.status(500).json({
            error: 'Failed to fetch from sangtacviet',
            details: error.message,
        });
    }
});

module.exports = sangtacviet;
