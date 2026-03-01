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

const NETLIFY_API_BASE = 'https://astounding-banoffee-2f3992.netlify.app';

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
        } catch(err: any) {
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
        } catch(err: any) {
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
        } catch(err: any) {
            return c.json({ error: 'Proxy fetch failed', message: err.message }, 500 as any);
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
