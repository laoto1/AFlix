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
import nettruyenRouter from './routes/nettruyen';
import nhentaiRouter from './routes/nhentai';
import nhentaiTagsRouter from './routes/nhentai-tags';

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
app.get(
    '/api/nettruyen/*',
    cache({
        cacheName: 'flix-scraping-cache',
        cacheControl: 'max-age=3600',
    })
);
app.get(
    '/api/nhentai/*',
    cache({
        cacheName: 'flix-scraping-cache',
        cacheControl: 'max-age=3600',
    })
);
app.get(
    '/api/nhentai-tags/*',
    cache({
        cacheName: 'flix-scraping-cache',
        cacheControl: 'max-age=86400', // Cache tags for 24 hours
    })
);

app.get('/', (c) => c.text('Cloudflare Worker Gateway Active'));

app.route('/api/auth', authRouter);
app.route('/api/profile', profileRouter);
app.route('/api/bookmarks', bookmarksRouter);
app.route('/api/history', historyRouter);
app.route('/api/upload', uploadRouter);
app.route('/api/chunking', chunkingRouter);
app.route('/api/nettruyen', nettruyenRouter);
app.route('/api/nhentai', nhentaiRouter);
app.route('/api/nhentai-tags', nhentaiTagsRouter);

export default app;
