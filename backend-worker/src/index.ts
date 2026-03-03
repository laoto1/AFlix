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
// --- Scraper Caching Proxies ---
// We offload scraping to Netlify to bypass Cloudflare Worker WAF blocks (Turnstile/403).
// The worker will still cache the results for 1 hour to prevent Netlify from exhausting free tier limits.

const NETLIFY_API_BASE = 'https://fancy-kringle-4db3b4.netlify.app';

app.get(
    '/api/nettruyen/*',
    async (c) => {
        try {
            const reqUrl = new URL(c.req.url);
            const proxyUrl = new URL(reqUrl.pathname + reqUrl.search, NETLIFY_API_BASE);
            const res = await fetch(proxyUrl.toString(), {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
            });
            const data = await res.text();

            return new Response(data, {
                status: res.status,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Cache-Control': 'public, max-age=3600'
                }
            });
        } catch (err: any) {
            return c.json({ error: 'Proxy fetch failed', message: err.message }, 500 as any);
        }
    }
);

app.get(
    '/api/nhentai/*',
    async (c) => {
        try {
            const reqUrl = new URL(c.req.url);
            const proxyUrl = new URL(reqUrl.pathname + reqUrl.search, NETLIFY_API_BASE);
            const res = await fetch(proxyUrl.toString(), {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
            });
            const data = await res.text();

            return new Response(data, {
                status: res.status,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Cache-Control': 'public, max-age=3600'
                }
            });
        } catch (err: any) {
            return c.json({ error: 'Proxy fetch failed', message: err.message }, 500 as any);
        }
    }
);

app.get(
    '/api/sangtacviet/*',
    async (c) => {
        try {
            const reqUrl = new URL(c.req.url);
            const proxyUrl = new URL(reqUrl.pathname + reqUrl.search, NETLIFY_API_BASE);
            const res = await fetch(proxyUrl.toString(), {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
            });
            const data = await res.text();

            return new Response(data, {
                status: res.status,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Cache-Control': 'public, max-age=1800'
                }
            });
        } catch (err: any) {
            return c.json({ error: 'Proxy fetch failed', message: err.message }, 500 as any);
        }
    }
);

app.get(
    '/api/nhentai-tags/*',
    async (c) => {
        try {
            const reqUrl = new URL(c.req.url);
            const proxyUrl = new URL(reqUrl.pathname + reqUrl.search, NETLIFY_API_BASE);
            const res = await fetch(proxyUrl.toString(), {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
            });
            const data = await res.text();

            return new Response(data, {
                status: res.status,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Cache-Control': 'public, max-age=86400'
                }
            });
        } catch (err: any) {
            return c.json({ error: 'Proxy fetch failed', message: err.message }, 500 as any);
        }
    }
);

// --- Direct STV Proxy (for client-side chapter reading) ---
// The sangtacviet readchapter endpoint requires browser-level session management
// that cannot be replicated server-side. This proxy transparently forwards requests.
const STV_ORIGIN = 'http://14.225.254.182.nip.io';

app.all(
    '/api/stv-proxy/*',
    async (c) => {
        try {
            const reqUrl = new URL(c.req.url);
            // Strip /api/stv-proxy prefix to get the actual path
            const targetPath = reqUrl.pathname.replace('/api/stv-proxy', '') || '/';
            const targetUrl = `${STV_ORIGIN}${targetPath}${reqUrl.search}`;

            const method = c.req.method;
            const headers: Record<string, string> = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': STV_ORIGIN + '/',
            };

            // Forward cookies from request
            const cookieHeader = c.req.header('X-STV-Cookie');
            if (cookieHeader) headers['Cookie'] = cookieHeader;

            // Forward content-type for POST
            const ct = c.req.header('Content-Type');
            if (ct) headers['Content-Type'] = ct;

            const fetchOptions: RequestInit = { method, headers };
            if (method === 'POST') {
                fetchOptions.body = await c.req.text();
            }

            const res = await fetch(targetUrl, fetchOptions);
            const data = await res.text();

            // Forward set-cookie from sangtacviet
            const respHeaders: Record<string, string> = {
                'Content-Type': res.headers.get('Content-Type') || 'text/html',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type, X-STV-Cookie',
            };

            const setCookie = res.headers.get('Set-Cookie');
            if (setCookie) {
                respHeaders['X-STV-Set-Cookie'] = setCookie;
            }

            return new Response(data, { status: res.status, headers: respHeaders });
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

export default app;
