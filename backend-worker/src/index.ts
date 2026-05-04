import { Hono } from 'hono';
import { cors } from 'hono/cors';

export interface Env {
    TIDB_HOST: string;
    TIDB_USER: string;
    TIDB_PASSWORD?: string;
    TIDB_DATABASE: string;
    JWT_SECRET: string;
    IMGBB_API_KEY: string;
    TELEGRAM_BOT_TOKEN: string;
    TELEGRAM_CHAT_ID: string;
    NETTRUYEN_DOMAINS: string;
    STV_CHAPTER_API?: string;  // Railway Docker service URL for chapter scraping
}

const app = new Hono<{ Bindings: Env }>();

import authRouter from './routes/auth';
import profileRouter from './routes/profile';
import bookmarksRouter from './routes/bookmarks';
import historyRouter from './routes/history';
import uploadRouter from './routes/upload';
import chunkingRouter from './routes/chunking';
import unlockRouter from './routes/unlock';
import proxyRouter from './routes/proxy';
import metruyenchuRouter from './routes/metruyenchu';
import nettruyenRouter from './routes/nettruyen';
import nhentaiRouter from './routes/nhentai';
import nhentaiTagsRouter from './routes/nhentai-tags';
import kkphimRouter from './routes/kkphim';
// Note: sangtacviet is not fully migrated to Hono yet, but we will mount it later if needed.

import { cache } from 'hono/cache';

app.use('*', cors({
    origin: '*',
    allowMethods: ['POST', 'GET', 'OPTIONS', 'PUT', 'DELETE'],
    allowHeaders: ['Content-Type', 'Authorization'],
    exposeHeaders: ['Content-Length', 'x-request-id'],
    maxAge: 86400,
}));

// Pre-flight handler
app.options('*', (c) => c.text('', 200));

// Apply 1-hour Serverless Caching to massive scraping endpoints to maximize Edge performance and avoid rate limits
app.route('/api/nettruyen', nettruyenRouter);
app.route('/api/nhentai', nhentaiRouter);
app.route('/api/nhentai-tags', nhentaiTagsRouter);
app.route('/api/kkphim', kkphimRouter);

app.route('/api/metruyenchu', metruyenchuRouter);

app.get(
    '/api/sangtacviet/*',
    async (c) => {
        try {
            const reqUrl = new URL(c.req.url);
            const action = reqUrl.searchParams.get('action');

            // Chapter reading: use Hugging Face / Docker backend API
            if (action === 'chapter') {
                const host = reqUrl.searchParams.get('host') || 'ciweimao';
                const bookid = reqUrl.searchParams.get('bookid') || '';
                const chapterId = reqUrl.searchParams.get('chapterId') || '';
                
                if (!bookid || !chapterId) {
                    return c.json({ error: 'Missing bookid or chapterId' }, 400 as any);
                }

                try {
                    const stvChapterApi = c.env?.STV_CHAPTER_API;
                    if (stvChapterApi) {
                        const proxyUrl = new URL(reqUrl.pathname + reqUrl.search, stvChapterApi);
                        const res = await fetch(proxyUrl.toString(), {
                            headers: { 'User-Agent': c.req.header('User-Agent') || 'Mozilla/5.0' }
                        });
                        const data = await res.json();
                        return c.json(data, res.status as any);
                    }
                } catch (err: any) {
                    return c.json({ error: 'Chapter fetch failed', message: err.message }, 500 as any);
                }
            }

            return c.json({ error: 'SangTacViet scraper has been decoupled from Netlify and needs local Hono implementation.' }, 501 as any);
        } catch (err: any) {
            return c.json({ error: 'Proxy fetch failed', message: err.message }, 500 as any);
        }
    }
);

// --- STV Mobile API Chapter Fetcher ---
// Mimics the SangTacViet mobile app's flow to bypass web anti-bot
const STV_APP_UA = 'Mozilla/5.0 (Linux; Android 12; SM-S938U Build/V417IR; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/110.0.5481.154 Safari/537.36';
const STV_API_BASE = 'https://dns1.stv-appdomain-00000001.org';

async function fetchSTVChapter(host: string, bookid: string, chapterId: string) {
    const cookies: Record<string, string> = {
        'transmode': 'name',
        'foreignlang': 'vi',
        'mac_tt': 'true',
    };
    
    const appHeaders = {
        'User-Agent': STV_APP_UA,
        'x-requested-with': 'com.sangtacviet.mobilereader',
        'x-stv-transport': 'app',
        'X-STV-Sign': '5c5740458c2424c38568efd73ca273b5',
        'Accept': '*/*',
        'Accept-Language': 'vi-VN,vi;q=0.9',
    };
    
    function buildCookieString(): string {
        return Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ');
    }
    
    function collectCookies(res: Response) {
        // Collect all Set-Cookie headers
        const raw = res.headers.get('Set-Cookie') || '';
        if (!raw) return;
        // Parse multiple cookies from the header
        const parts = raw.split(/,\s*(?=[A-Za-z_]+=)/);
        for (const part of parts) {
            const match = part.match(/^([^=]+)=([^;]*)/);
            if (match) {
                cookies[match[1].trim()] = match[2].trim();
            }
        }
    }
    
    // Step 1: GET the chapter page to get PHPSESSID and initial cookies
    const pageUrl = `${STV_API_BASE}/truyen/${host}/1/${bookid}/${chapterId}/`;
    const pageRes = await fetch(pageUrl, {
        headers: {
            ...appHeaders,
            'Cookie': buildCookieString(),
        },
        redirect: 'follow',
    });
    collectCookies(pageRes);
    // Consume body to avoid hanging
    await pageRes.text();
    
    // Step 2: Call grantcontext to get readcontextid
    const contextUrl = `${STV_API_BASE}/io/grantcontext/context?hostid=${host}&bookid=${bookid}`;
    const contextRes = await fetch(contextUrl, {
        headers: {
            ...appHeaders,
            'Cookie': buildCookieString(),
        },
    });
    collectCookies(contextRes);
    // The response is obfuscated JS - we don't execute it,
    // but the readcontextid cookie from the response is what we need
    await contextRes.text();
    
    // Step 3: Try readchapter 
    const readUrl = `${STV_API_BASE}/index.php?bookid=${bookid}&h=${host}&c=${chapterId}&ngmar=readc&sajax=readchapter&sty=1&exts=`;
    
    // Try up to 3 times (code 7 means reload needed)
    for (let attempt = 0; attempt < 3; attempt++) {
        const readRes = await fetch(readUrl, {
            method: 'POST',
            headers: {
                ...appHeaders,
                'Cookie': buildCookieString(),
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-Requested-With': 'XMLHttpRequest',
                'Referer': pageUrl,
            },
        });
        collectCookies(readRes);
        
        let readText = await readRes.text();
        
        // Extract JSON from response (may have JS prefix)
        const jsonIdx = readText.indexOf('{"');
        if (jsonIdx > 0) readText = readText.substring(jsonIdx);
        
        try {
            const data = JSON.parse(readText);
            
            if (data.code === '0' || data.code === 0) {
                return {
                    data: {
                        item: {
                            _id: chapterId,
                            name: data.chaptername || data.cn || '',
                            book_name: data.bookname || data.bn || '',
                            content: data.data || data.content || '',
                        }
                    }
                };
            }
            
            if ((data.code === '7' || data.code === 7) && attempt < 2) {
                // Code 7 = need page reload. Re-fetch the page and retry
                const reloadRes = await fetch(pageUrl, {
                    headers: {
                        ...appHeaders,
                        'Cookie': buildCookieString(),
                    },
                    redirect: 'follow',
                });
                collectCookies(reloadRes);
                await reloadRes.text();
                continue;
            }
            
            if (data.code === '5' || data.code === 5) {
                // Code 5 = need grantcontext again
                const ctx2 = await fetch(contextUrl, {
                    headers: {
                        ...appHeaders,
                        'Cookie': buildCookieString(),
                    },
                });
                collectCookies(ctx2);
                await ctx2.text();
                continue;
            }
            
            throw new Error(`readchapter code=${data.code}, err=${data.err || ''}, cookies=${buildCookieString()}`);
        } catch (e: any) {
            if (e.message.includes('readchapter') || e.message.includes('code=')) throw e;
            throw new Error(`Parse error: ${readText.substring(0, 200)}`);
        }
    }
    
    throw new Error('readchapter: max retries exceeded');
}

// Removed legacy nhentai-tags proxy

// --- STV Reverse Proxy (Full Client-side Chapter Reader) ---
// Instead of server-side browser rendering, we serve the STV page through the worker.
// The CLIENT browser executes all JS, solves CF challenges, and handles cookies natively.
// The readchapter XHR goes through this proxy transparently.

const STV_ORIGIN = 'https://sangtacviet.vip';
const STV_DOMAINS = ['sangtacviet.vip', 'sangtacviet.com'];
const STV_API_DOMAINS = ['dns1.stv-appdomain-00000001.org', 'dns2.stv-appdomain-00000001.org'];

// Shared proxy fetch function for STV
async function proxyToSTV(c: any, targetPath: string, search: string) {
    const reqUrl = new URL(c.req.url);
    const workerOrigin = reqUrl.origin;
    const targetUrl = `${STV_ORIGIN}${targetPath}${search}`;

    const method = c.req.method;
    const headers: Record<string, string> = {
        'User-Agent': c.req.header('User-Agent') || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': c.req.header('Accept') || '*/*',
        'Accept-Language': c.req.header('Accept-Language') || 'vi-VN,vi;q=0.9',
        'Referer': `${STV_ORIGIN}/`,
        'Host': 'sangtacviet.vip',
    };

    // Forward cookies
    const cookieHeader = c.req.header('Cookie');
    if (cookieHeader) headers['Cookie'] = cookieHeader;

    // Forward XHR headers
    const xhr = c.req.header('X-Requested-With');
    if (xhr) headers['X-Requested-With'] = xhr;

    const ct = c.req.header('Content-Type');
    if (ct) headers['Content-Type'] = ct;

    const fetchOptions: RequestInit = { method, headers, redirect: 'follow' };
    if (method === 'POST') {
        fetchOptions.body = await c.req.text();
    }

    const res = await fetch(targetUrl, fetchOptions);

    const contentType = res.headers.get('Content-Type') || '';
    const respHeaders: Record<string, string> = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, X-Requested-With, Cookie',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Credentials': 'true',
    };

    // Forward all Set-Cookie headers from STV
    const setCookieAll = res.headers.getAll?.('Set-Cookie') || [];
    const setCookie = setCookieAll.length > 0 ? setCookieAll : (res.headers.get('Set-Cookie') ? [res.headers.get('Set-Cookie')!] : []);
    if (setCookie.length > 0) {
        // Rewrite cookie domain/secure to work on worker domain
        respHeaders['Set-Cookie'] = setCookie.map(sc =>
            sc.replace(/domain=[^;]+;?/gi, '').replace(/secure;?/gi, '').replace(/samesite=[^;]+;?/gi, 'SameSite=None;')
        ).join(', ');
    }

    // Detect STV API calls (readchapter, grantcontext, etc.) - these return JSON
    // even with text/javascript content-type. Pass them through without modification.
    const isApiCall = search.includes('sajax=') || search.includes('ngmar=') || 
                      search.includes('grantcontext') || targetPath.includes('/io/');
    const isXhr = c.req.header('X-Requested-With') === 'XMLHttpRequest';
    
    if (isApiCall || isXhr) {
        // For API responses, pass through cleanly without any HTML injection
        respHeaders['Content-Type'] = contentType || 'text/javascript';
        const data = await res.arrayBuffer();
        return new Response(data, { status: res.status, headers: respHeaders });
    }

    // For Javascript files, inject a sandbox wrapper to spoof location
    if (contentType.includes('javascript') || contentType.includes('application/javascript') || targetPath.endsWith('.js')) {
        let js = await res.text();
        
        // Wrap the JS in a sandbox that proxies window and document
        const sandboxPrefix = `
;(function() {
    try {
        var fakeHost = 'sangtacviet.vip';
        var fakeOrigin = 'https://sangtacviet.vip';
        var fakePath = window.location.pathname.replace('/api/stv-proxy', '');
        var fakeHref = fakeOrigin + fakePath + window.location.search + window.location.hash;
        
        var fakeLocation = window.__stvLocation || {
            hostname: fakeHost, host: fakeHost, origin: fakeOrigin, href: fakeHref,
            pathname: fakePath, protocol: 'https:', search: window.location.search,
            hash: window.location.hash, port: '',
            assign: function(url) { window.location.assign(url); },
            replace: function(url) { window.location.replace(url); },
            reload: function() { window.location.reload(); },
            toString: function() { return fakeHref; }
        };

        var windowProxy = new Proxy(window, {
            get: function(target, prop) {
                if (prop === 'location') return fakeLocation;
                if (prop === 'document') return documentProxy;
                if (prop === 'window') return windowProxy;
                var val = target[prop];
                return typeof val === 'function' && !val.prototype ? val.bind(target) : val;
            },
            set: function(target, prop, value) { target[prop] = value; return true; }
        });

        var documentProxy = new Proxy(document, {
            get: function(target, prop) {
                if (prop === 'domain') return fakeHost;
                if (prop === 'location') return fakeLocation;
                if (prop === 'defaultView') return windowProxy;
                var val = target[prop];
                return typeof val === 'function' ? val.bind(target) : val;
            },
            set: function(target, prop, value) {
                if (prop === 'cookie' && typeof value === 'string') {
                    // Strip domain so cookies save on the proxy domain
                    value = value.replace(/domain=[^;]+;?/gi, '');
                }
                target[prop] = value;
                return true;
            }
        });

        (function(window, document, location) {
`;
        const sandboxSuffix = `
        }).call(windowProxy, windowProxy, documentProxy, fakeLocation);
    } catch(e) { console.error('STV Sandbox error:', e); }
})();
`;
        respHeaders['Content-Type'] = 'application/javascript; charset=utf-8';
        return new Response(sandboxPrefix + js + sandboxSuffix, { status: res.status, headers: respHeaders });
    }

    // For HTML responses, rewrite URLs to route through our proxy
    if (contentType.includes('text/html')) {
        let html = await res.text();

        // Inject hostname spoofing + <base> tag so STV JS thinks it's on the real domain
        // and all relative URLs resolve through our proxy
        const spoofScript = `<script>
// Spoof location properties so STV's obfuscated JS thinks we're on sangtacviet.vip
(function() {
    var realLocation = window.location;
    var fakeHost = 'sangtacviet.vip';
    var fakeOrigin = 'https://sangtacviet.vip';
    var fakePath = realLocation.pathname.replace('/api/stv-proxy', '');
    var fakeHref = fakeOrigin + fakePath + realLocation.search + realLocation.hash;
    
    try {
        Object.defineProperty(window, '__stvLocation', { value: {
            hostname: fakeHost,
            host: fakeHost,
            origin: fakeOrigin,
            href: fakeHref,
            pathname: fakePath,
            protocol: 'https:',
            search: realLocation.search,
            hash: realLocation.hash,
            port: '',
            assign: function(url) { realLocation.assign(url); },
            replace: function(url) { realLocation.replace(url); },
            reload: function() { realLocation.reload(); },
            toString: function() { return fakeHref; }
        }, configurable: false });
        
        // Override location getter on window - this tricks most obfuscated checks
        var origDesc = Object.getOwnPropertyDescriptor(window, 'location');
        if (origDesc && origDesc.configurable !== false) {
            Object.defineProperty(window, 'location', {
                get: function() { return window.__stvLocation; },
                set: function(v) { realLocation.href = v; },
                configurable: false
            });
        }
    } catch(e) {
        // location may not be overridable in all browsers, fallback to document.domain trick
    }
    
    // Also spoof document.domain if possible
    try { document.domain = fakeHost; } catch(e) {}
})();
</script>`;
        const baseTag = `<base href="${workerOrigin}/api/stv-proxy/">`;
        const headInjection = spoofScript + baseTag;
        if (html.includes('<head>')) {
            html = html.replace('<head>', `<head>${headInjection}`);
        } else if (html.includes('<HEAD>')) {
            html = html.replace('<HEAD>', `<HEAD>${headInjection}`);
        } else {
            html = headInjection + html;
        }

        // Rewrite absolute URLs to STV domains → our proxy
        for (const domain of STV_DOMAINS) {
            html = html.replace(new RegExp(`https?://${domain.replace('.', '\\.')}/`, 'g'), `${workerOrigin}/api/stv-proxy/`);
        }
        // Also rewrite STV API subdomains
        for (const domain of STV_API_DOMAINS) {
            html = html.replace(new RegExp(`https?://${domain.replace(/\./g, '\\.')}/`, 'g'), `${workerOrigin}/api/stv-proxy/`);
        }

        // Inject a script to auto-click the chapter load trigger and send content back
        const injectedScript = `
<script>
(function() {
    // AUTO-CLICK: STV requires a click on "Nhấp vào để tải chương..." to start loading
    function autoClickLoadTrigger() {
        // Try multiple selectors for the loading trigger
        var trigger = document.querySelector('#loadchaptercontent') || 
                      document.querySelector('.cld-click-to-load') ||
                      document.querySelector('[onclick*="loadchapter"]');
        
        if (trigger) {
            console.log('[STV-Bridge] Found load trigger, clicking...');
            trigger.click();
            return true;
        }
        
        // Try finding by text content
        var allElements = document.querySelectorAll('div, span, a, p');
        for (var i = 0; i < allElements.length; i++) {
            var text = allElements[i].textContent.trim();
            if (text === 'Nhấp vào để tải chương...' || text.indexOf('Nhấp vào') >= 0) {
                console.log('[STV-Bridge] Found trigger by text, clicking...');
                allElements[i].click();
                return true;
            }
        }
        
        // Also try the redo button
        var redo = document.getElementById('tm-btn-redo');
        if (redo) {
            console.log('[STV-Bridge] Clicking redo button as fallback...');
            redo.click();
            return true;
        }
        
        // Try calling STV's readchapter function directly if available
        if (typeof window.loadchaptercontent === 'function') {
            console.log('[STV-Bridge] Calling loadchaptercontent directly...');
            window.loadchaptercontent();
            return true;
        }
        
        return false;
    }
    
    // Poll for the trigger element (STV's JS may not have rendered it yet)
    var clickAttempts = 0;
    var clickInterval = setInterval(function() {
        clickAttempts++;
        if (autoClickLoadTrigger() || clickAttempts > 30) {
            clearInterval(clickInterval);
        }
    }, 500);
    
    // Watch for chapter content to load
    var observer = new MutationObserver(function() {
        var el = document.querySelector('[id^="cld-"]') || document.getElementById('maincontent');
        if (el && el.textContent.trim().length > 200) {
            var text = el.textContent.trim().toLowerCase();
            if (text.indexOf('tai chuong') >= 0 || text.indexOf('nhap vao') >= 0 || text.indexOf('dang tai') >= 0) return;
            var chName = (document.querySelector('#bookchapnameholder') || {}).textContent || '';
            var bkName = (document.querySelector('#booknameholder') || {}).textContent || '';
            window.parent.postMessage({
                type: 'stv-chapter-loaded',
                content: el.innerHTML,
                chapterName: chName,
                bookName: bkName,
                contentLength: el.textContent.trim().length
            }, '*');
        }
    });
    if (document.body) {
        observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    } else {
        document.addEventListener('DOMContentLoaded', function() {
            observer.observe(document.body, { childList: true, subtree: true, characterData: true });
        });
    }

    // Intercept XHR to rewrite API URLs to proxy and capture readchapter
    var origXHROpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url) {
        if (url && typeof url === 'string') {
            // Rewrite absolute STV URLs to proxy
            if (url.indexOf('sangtacviet') >= 0 || url.indexOf('stv-appdomain') >= 0) {
                try {
                    var u = new URL(url);
                    if (u.hostname.indexOf('sangtacviet') >= 0 || u.hostname.indexOf('stv-appdomain') >= 0) {
                        url = window.location.origin + '/api/stv-proxy' + u.pathname + u.search;
                    }
                } catch(e) {}
            } else if (url.startsWith('/')) {
                url = window.location.origin + '/api/stv-proxy' + url;
            }
            
            // Capture readchapter response
            if (url.indexOf('sajax=readchapter') >= 0) {
                this.addEventListener('load', function() {
                    try {
                        var text = this.responseText;
                        var idx = text.indexOf('{"');
                        if (idx > 0) text = text.substring(idx);
                        var data = JSON.parse(text);
                        if (data.code === "0" || data.code === 0) {
                            window.parent.postMessage({
                                type: 'stv-chapter-data',
                                data: data
                            }, '*');
                        }
                    } catch(e) { console.log('STV XHR parse error:', e); }
                });
            }
        }
        return origXHROpen.apply(this, arguments);
    };

    // Intercept fetch just in case
    var origFetch = window.fetch;
    window.fetch = function(url, options) {
        var urlStr = typeof url === 'string' ? url : (url && url.url ? url.url : '');
        if (urlStr) {
            if (urlStr.indexOf('sangtacviet') >= 0 || urlStr.indexOf('stv-appdomain') >= 0) {
                try {
                    var u = new URL(urlStr);
                    if (u.hostname.indexOf('sangtacviet') >= 0 || u.hostname.indexOf('stv-appdomain') >= 0) {
                        var newUrl = window.location.origin + '/api/stv-proxy' + u.pathname + u.search;
                        if (typeof url === 'string') url = newUrl;
                        else url = new Request(newUrl, url);
                    }
                } catch(e) {}
            } else if (urlStr.startsWith('/')) {
                var newUrl2 = window.location.origin + '/api/stv-proxy' + urlStr;
                if (typeof url === 'string') url = newUrl2;
                else url = new Request(newUrl2, url);
            }
        }
        return origFetch.apply(this, arguments);
    };
})();
</script>`;
        html = html.replace('</body>', injectedScript + '</body>');
        if (!html.includes(injectedScript)) {
            html += injectedScript;
        }

        respHeaders['Content-Type'] = 'text/html; charset=utf-8';
        // Remove X-Frame-Options to allow iframe embedding
        return new Response(html, { status: res.status, headers: respHeaders });
    }

    // For JS/CSS, rewrite absolute STV URLs too
    if (contentType.includes('javascript') || contentType.includes('css')) {
        let text = await res.text();
        for (const domain of STV_DOMAINS) {
            text = text.replace(new RegExp(`https?://${domain.replace('.', '\\.')}/`, 'g'), `${workerOrigin}/api/stv-proxy/`);
        }
        for (const domain of STV_API_DOMAINS) {
            text = text.replace(new RegExp(`https?://${domain.replace(/\./g, '\\.')}/`, 'g'), `${workerOrigin}/api/stv-proxy/`);
        }
        respHeaders['Content-Type'] = contentType;
        return new Response(text, { status: res.status, headers: respHeaders });
    }

    // For API/JSON/other responses, pass through
    respHeaders['Content-Type'] = contentType;
    const data = await res.arrayBuffer();
    return new Response(data, { status: res.status, headers: respHeaders });
}

// Explicit /api/stv-proxy/* route
app.all(
    '/api/stv-proxy/*',
    async (c) => {
        try {
            const reqUrl = new URL(c.req.url);
            const targetPath = reqUrl.pathname.replace('/api/stv-proxy', '') || '/';
            return proxyToSTV(c, targetPath, reqUrl.search);
        } catch (err: any) {
            return c.json({ error: 'STV proxy failed', message: err.message }, 500 as any);
        }
    }
);

app.get('/', (c) => c.text('Cloudflare Worker Gateway Active'));

app.route('/api/auth', authRouter);
app.route('/api/profile', profileRouter);
app.route('/api/bookmarks', bookmarksRouter);
app.route('/api/history', historyRouter);
app.route('/api/upload', uploadRouter);
app.route('/api/chunking', chunkingRouter);
app.route('/api/unlock', unlockRouter);
app.route('/api/proxy', proxyRouter);

// --- SEO / OG Tags Interceptor for Discord/Facebook ---
app.get(
    '/movie/:sourceId/:slug',
    cache({
        cacheName: 'flix-seo-cache',
        cacheControl: 'max-age=86400',
    }),
    async (c) => {
    const sourceId = c.req.param('sourceId');
    const slug = c.req.param('slug');
    const ep = c.req.query('ep');
    let movieName = 'FLIX - Xem Phim';
    let description = 'Xem phim trực tuyến miễn phí với chất lượng cao.';
    let posterUrl = 'https://phimimg.com/uploads/movies/default.jpg';
        
        if (sourceId === 'kkphim') {
            try {
                const res = await fetch(`https://phimapi.com/phim/${slug}`).then(r => r.json() as any);
                if (res?.movie) {
                    movieName = res.movie.name;
                    if (res.movie.origin_name && res.movie.origin_name !== res.movie.name) {
                        movieName += ` (${res.movie.origin_name})`;
                    }
                    if (ep) {
                        const epName = ep.replace(/-/g, ' ').replace(/^tap/i, 'Tập');
                        movieName = `Đang xem ${epName} - ${movieName}`;
                    }
                    description = res.movie.content?.replace(/<[^>]*>?/gm, '').substring(0, 200) || description;
                    posterUrl = res.movie.poster_url || res.movie.thumb_url;
                    if (posterUrl && !posterUrl.startsWith('http')) posterUrl = `https://phimimg.com/${posterUrl}`;
                }
            } catch (e) {}
        } else if (sourceId === 'thepy') {
            let epName = ep ? ep.replace(/-/g, ' ').replace(/^tap/i, 'Tập') : '';
            movieName = epName ? `Đang xem ${epName} - Phim ${slug.replace(/-/g, ' ')}` : `Phim ${slug.replace(/-/g, ' ')}`;
        }
        
        const html = `<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <title>${movieName}</title>
    <meta name="description" content="${description}">
    <meta property="og:title" content="${movieName}">
    <meta property="og:description" content="${description}">
    <meta property="og:image" content="${posterUrl}">
    <meta property="og:url" content="${c.req.url}">
    <meta property="og:type" content="video.movie">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${movieName}">
    <meta name="twitter:description" content="${description}">
    <meta name="twitter:image" content="${posterUrl}">
</head>
<body>
    <p>Đang chuyển hướng đến phim...</p>
    <script>
        // Redirect normal users to the actual frontend
        var search = window.location.search || '';
        if (!search && '${ep}') search = '?ep=${ep}';
        window.location.replace('https://aflix.laoto.workers.dev/#/movie/${sourceId}/${slug}' + search);
    </script>
</body>
</html>`;
        return c.html(html);
});

// --- STV Fallback Catch-All ---
// When the iframe loads STV HTML via /api/stv-proxy/, the <base> tag makes relative URLs
// resolve to /api/stv-proxy/. But dynamically constructed JS URLs (XHR, script injection)
// might still resolve to the worker root (e.g., /index.php?sajax=readchapter).
// This catch-all forwards those to STV as a fallback.
const STV_FALLBACK_PATTERNS = /^\/(index\.php|io\/|stv\.|qt|reading|crylib|cryad|jquery|bootstrap|font|css|js|img|image|uploads|truyen\/)/i;

app.all('*', async (c) => {
    const reqUrl = new URL(c.req.url);
    const path = reqUrl.pathname;
    
    // Only proxy paths that look like STV resources, not random paths
    // Check Referer - if the request came from our proxy page, it's likely an STV resource
    const referer = c.req.header('Referer') || '';
    const isFromProxy = referer.includes('/api/stv-proxy') || referer.includes('backend-worker');
    
    if (isFromProxy || STV_FALLBACK_PATTERNS.test(path)) {
        try {
            return await proxyToSTV(c, path, reqUrl.search);
        } catch (err: any) {
            return c.json({ error: 'STV fallback proxy failed', message: err.message }, 404 as any);
        }
    }
    
    return c.text('Not Found', 404);
});

export default app;
