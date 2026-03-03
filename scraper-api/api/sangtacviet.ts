const express = require('express');
import axios from 'axios';
import * as cheerio from 'cheerio';

// ── SangTacViet Scraper API ──
const DOMAIN = 'http://14.225.254.182.nip.io';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// Session cookie management
let sessionCookies: string[] = [];
let sessionExpiry = 0;

function updateCookies(headers: any) {
    const setCookies = headers['set-cookie'];
    if (setCookies) {
        const newCookies = (Array.isArray(setCookies) ? setCookies : [setCookies]).map((c: string) => c.split(';')[0]);
        for (const nc of newCookies) {
            const key = nc.split('=')[0];
            sessionCookies = sessionCookies.filter(c => !c.startsWith(key + '='));
            sessionCookies.push(nc);
        }
    }
}

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
        updateCookies(res.headers);
        sessionExpiry = Date.now() + 30 * 60 * 1000;
    } catch (e) { /* ignore */ }
    return sessionCookies.join('; ');
}

// Fetch a page and extract inline cookies (_acx, _gac, _ac) from script tags
async function fetchPageWithAcx(path: string): Promise<{ html: string; acx: string; gac: string; ac: string }> {
    const cookie = await ensureSession();
    const url = path.startsWith('http') ? path : `${DOMAIN}${path}`;
    const res = await axios.get(url, {
        headers: { 'User-Agent': UA, 'Cookie': cookie, 'Referer': DOMAIN },
        timeout: 15000,
        responseType: 'text',
    });
    updateCookies(res.headers);

    const html = res.data;
    // Extract _acx cookie from inline script: document.cookie='_acx=...; path=/'
    const acxMatch = html.match(/_acx=([^;'"]+)/);
    const acx = acxMatch ? acxMatch[1] : '';
    // Extract _gac cookie set inline: document.cookie="_gac=...; path=/"
    const gacMatch = html.match(/document\.cookie\s*=\s*["']_gac=([^;'"]+)/);
    const gac = gacMatch ? gacMatch[1] : '';
    // Extract _ac cookie set inline: document.cookie="_ac=...; path=/"
    const acMatch = html.match(/document\.cookie\s*=\s*["']_ac=([^;'"]+)/);
    const ac = acMatch ? acMatch[1] : '';

    return { html, acx, gac, ac };
}

async function postData(path: string, body: string): Promise<string> {
    const cookie = await ensureSession();
    const url = path.startsWith('http') ? path : `${DOMAIN}${path}`;
    const res = await axios.post(url, body, {
        headers: {
            'User-Agent': UA, 'Cookie': cookie, 'Referer': DOMAIN,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 15000,
        responseType: 'text',
    });
    updateCookies(res.headers);
    return res.data;
}

function parseNovelListFromHtml(html: string): any[] {
    const $ = cheerio.load(html);
    const novels: any[] = [];

    $('a.booksearch').each((_, el) => {
        const $el = $(el);
        const href = $el.attr('href') || '';
        const match = href.match(/\/truyen\/([^/]+)\/\d+\/([^/]+)/);
        if (!match) return;

        const host = match[1];
        const bookid = match[2];
        const title = $el.find('.searchbooktitle').text().trim();
        const author = $el.find('.searchbookauthor').text().trim();
        const cover = $el.find('img').attr('src') || '';

        const infoSpans = $el.find('.info span');
        let views = '', likes = '', chapters = '';
        infoSpans.each((i, sp) => {
            const text = $(sp).text().trim();
            if (i === 0) views = text;
            if (i === 1) likes = text;
            if (i === 2) chapters = text;
        });

        const tags: string[] = [];
        $el.find('.searchtag').each((_, t) => {
            tags.push($(t).text().trim());
        });

        novels.push({
            _id: `${host}-${bookid}`,
            name: title, host, bookid,
            slug: `${host}/${bookid}`,
            thumb_url: cover, author, views, likes,
            chapters_count: chapters, tags,
            category: tags.slice(2).map(t => ({ name: t, slug: t })),
            updatedAt: '',
        });
    });

    return novels;
}

const sangtacviet = express.Router();

sangtacviet.get('/', async (req: any, res: any) => {
    const {
        action, page = '1', host = '', bookid = '', keyword = '', chapterId = '',
        sort = 'update', step = '', category = '', type = '',
    } = req.query || {};

    try {
        // ── LISTING ──
        if (action === 'listing') {
            const pageNum = parseInt(page as string) || 1;
            let queryStr = `?find=&minc=0&sort=${sort}&tag=`;
            if (step) queryStr += `&step=${step}`;
            if (category) queryStr += `&category=${category}`;
            if (type) queryStr += `&type=${type}`;
            queryStr += `&p=${pageNum}`;

            const html = await postData(`/io/searchtp/searchBooks${queryStr}`, 'ignores=');
            const novels = parseNovelListFromHtml(html);

            return res.json({
                status: 'success',
                data: {
                    items: novels,
                    params: {
                        pagination: {
                            currentPage: pageNum,
                            totalItems: novels.length >= 48 ? pageNum * 48 + 48 : pageNum * 48,
                            totalItemsPerPage: 48,
                        },
                    },
                },
            });
        }

        // ── SEARCH ──
        if (action === 'search') {
            if (!keyword) return res.status(400).json({ error: 'Missing keyword' });
            const queryStr = `?find=&findinname=${encodeURIComponent(keyword as string)}&minc=0&sort=update&tag=`;
            const html = await postData(`/io/searchtp/searchBooks${queryStr}`, 'ignores=');
            const novels = parseNovelListFromHtml(html);

            return res.json({
                status: 'success',
                data: {
                    items: novels,
                    params: { pagination: { currentPage: 1, totalItems: novels.length, totalItemsPerPage: 48 } },
                },
            });
        }

        // ── DETAIL ──
        if (action === 'detail') {
            if (!host || !bookid) return res.status(400).json({ error: 'Missing host or bookid' });

            const { html } = await fetchPageWithAcx(`/truyen/${host}/1/${bookid}/`);
            const $ = cheerio.load(html);

            const title = $('meta[property="og:novel:book_name"]').attr('content') || $('h1#book_name2').text().trim() || '';
            const author = $('meta[property="og:novel:author"]').attr('content') || '';
            const cover = $('meta[property="og:image"]').attr('content') || '';
            const status = $('meta[property="og:novel:status"]').attr('content') || '';
            const categoryMeta = $('meta[property="og:novel:category"]').attr('content') || '';
            const updateTime = $('meta[property="og:novel:update_time"]').attr('content') || '';
            const description = $('meta[property="og:description"]').attr('content') || '';
            const originalName = $('#oriname').text().trim() || '';

            const categories = categoryMeta.split(',').map(c => c.trim()).filter(Boolean).map(c => ({
                name: c, slug: c.toLowerCase().replace(/\s+/g, '-'),
            }));

            // Extract available hosts from the detail page
            const availableHosts: any[] = [];
            $('a[href*="/truyen/"]').each((_, el) => {
                const href = $(el).attr('href') || '';
                const hostMatch = href.match(/\/truyen\/([^/]+)\/\d+\/([^/]+)/);
                if (!hostMatch) return;
                const hName = hostMatch[1];
                const hBookId = hostMatch[2];
                const text = $(el).text().trim();
                // Extract chapter count from text like "69shu(843)"
                const countMatch = text.match(/\((\d+)\)/);
                const count = countMatch ? parseInt(countMatch[1]) : 0;
                if (hName && hBookId && !availableHosts.find(h => h.host === hName && h.bookid === hBookId)) {
                    availableHosts.push({
                        host: hName,
                        bookid: hBookId,
                        name: hName,
                        chapters_count: count,
                    });
                }
            });

            return res.json({
                status: 'success',
                data: {
                    item: {
                        _id: `${host}-${bookid}`, name: title, host, bookid,
                        slug: `${host}/${bookid}`, origin_name: originalName, author,
                        status: status === 'Còn tiếp' ? 'ongoing' : status === 'Hoàn thành' ? 'completed' : status,
                        thumb_url: cover, content: description, category: categories, updatedAt: updateTime,
                        available_hosts: availableHosts,
                        chapters: [],
                        chapter_api_data: `/api/sangtacviet?action=chapters&host=${host}&bookid=${bookid}`,
                    },
                },
            });
        }

        // ── CHAPTERS ──
        if (action === 'chapters') {
            if (!host || !bookid) return res.status(400).json({ error: 'Missing host or bookid' });

            // First visit the detail page to get the _acx cookie
            const { acx } = await fetchPageWithAcx(`/truyen/${host}/1/${bookid}/`);

            // Build cookies with _acx
            const cookie = sessionCookies.join('; ') + (acx ? `; _acx=${acx}` : '');

            // GET the chapter list with the _acx cookie
            const url = `${DOMAIN}/index.php?ngmar=chapterlist&h=${host}&bookid=${bookid}&sajax=getchapterlist`;
            const chRes = await axios.get(url, {
                headers: { 'User-Agent': UA, 'Cookie': cookie, 'Referer': `${DOMAIN}/truyen/${host}/1/${bookid}/` },
                timeout: 15000,
                responseType: 'text',
            });
            updateCookies(chRes.headers);

            let chapters: any[] = [];
            const data = chRes.data;
            if (data && data.trim()) {
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.code === 1 && parsed.data) {
                        // Format: "vip-/-chapterId-/- chapterName-//-..."
                        const chapterEntries = parsed.data.split('-//-').filter((s: string) => s.trim());
                        chapters = chapterEntries.map((entry: string, idx: number) => {
                            const parts = entry.split('-/-');
                            const chId = parts[1]?.trim() || String(idx + 1);
                            const chName = parts[2]?.trim() || `Chương ${idx + 1}`;
                            return {
                                _id: chId,
                                name: chName,
                                chapter_api_data: `/api/sangtacviet?action=chapter&host=${host}&bookid=${bookid}&chapterId=${chId}`,
                            };
                        });
                    }
                } catch (e) { /* ignore parse errors */ }
            }

            return res.json({ status: 'success', data: { items: chapters } });
        }

        // ── CHAPTER CONTENT ──
        if (action === 'chapter') {
            if (!host || !bookid || !chapterId) {
                return res.status(400).json({ error: 'Missing host, bookid, or chapterId' });
            }

            const { acx, gac, ac } = await fetchPageWithAcx(`/truyen/${host}/1/${bookid}/`);
            let cookie = sessionCookies.join('; ');
            if (acx) cookie += `; _acx=${acx}`;
            if (gac) cookie += `; _gac=${gac}`;
            if (ac) cookie += `; _ac=${ac}`;

            // For dich/sangtac hosts, exts param is required (width^fontcolor^bgcolor)
            const exts = (host === 'dich' || host === 'sangtac') ? '&exts=1140%5E-16777216%5E-1383213' : '';
            const url = `${DOMAIN}/index.php?bookid=${bookid}&h=${host}&c=${chapterId}&ngmar=readc&sajax=readchapter&sty=1${exts}`;
            const chRes = await axios.post(url, '', {
                headers: {
                    'User-Agent': UA, 'Cookie': cookie,
                    'Referer': `${DOMAIN}/truyen/${host}/1/${bookid}/${chapterId}/`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Content-Length': '0',
                },
                timeout: 15000,
                responseType: 'text',
            });

            let content = '', chapterName = `Chương ${chapterId}`, bookName = '';
            const data = chRes.data;

            try {
                if (data && data.trim()) {
                    let jsonStr = data;
                    const jsonStart = data.indexOf('{"');
                    if (jsonStart > 0) jsonStr = data.substring(jsonStart);
                    const parsed = JSON.parse(jsonStr);
                    if (parsed.code === '0' || parsed.code === 0 || parsed.data || parsed.content) {
                        content = parsed.data || parsed.content || parsed.c || '';
                        chapterName = parsed.chaptername || parsed.cn || chapterName;
                        bookName = parsed.bookname || parsed.bn || '';
                    }
                }
            } catch (e) {
                // Fallback: try loading the chapter page directly
                try {
                    const { html } = await fetchPageWithAcx(`/truyen/${host}/1/${bookid}/${chapterId}/`);
                    const $ = cheerio.load(html);
                    content = $('#maincontent').html() || '';
                    chapterName = $('title').text().trim() || chapterName;
                } catch (e2) { /* ignore */ }
            }

            return res.json({
                status: 'success',
                data: { item: { _id: chapterId, name: chapterName, book_name: bookName, content } },
            });
        }

        return res.status(400).json({ error: 'Unsupported action. Use: listing, search, detail, chapters, chapter' });

    } catch (error: any) {
        console.error('SangTacViet API Error:', error.message);
        return res.status(500).json({ error: 'Failed to fetch from sangtacviet', details: error.message });
    }
});

module.exports = sangtacviet;
