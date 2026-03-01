import { Hono } from 'hono';

const proxy = new Hono();

proxy.get('/', async (c) => {
    const url = c.req.query('url');
    if (!url) return c.json({ error: 'Missing image URL' }, 400);

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': url // Bypass some weak hotlink protections
            }
        });

        if (!response.ok) {
            return c.text('Image fetch failed', response.status as any);
        }

        const contentType = response.headers.get('content-type') || 'image/jpeg';
        const buffer = await response.arrayBuffer();

        return c.body(buffer, 200, {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=86400', // Cache on edge for 24h
        });
    } catch (err) {
        return c.json({ error: 'Proxy failed' }, 500);
    }
});

export default proxy;
