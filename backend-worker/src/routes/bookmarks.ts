import { Hono } from 'hono';
import jwt from 'jsonwebtoken';
import { getDbConnection } from '../utils/db';
import { Env } from '../index';

const bookmarks = new Hono<{ Variables: { userId: number }, Bindings: Env }>();

// JWT Auth middleware
bookmarks.use('*', async (c, next) => {
    if (c.req.method === 'OPTIONS') {
        return await next();
    }
    
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return c.json({ error: 'Unauthorized' }, 401);
    }
    const token = authHeader.split(' ')[1];
    const JWT_SECRET = c.env.JWT_SECRET || 'fallback_secret';

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        c.set('userId', decoded.userId);
        await next();
    } catch {
        return c.json({ error: 'Invalid token' }, 401);
    }
});

bookmarks.get('/', async (c) => {
    try {
        const db = getDbConnection(c.env);
        const userId = c.get('userId');
        const comicSlug = c.req.query('comicSlug');

        if (comicSlug) {
            const result = await db.execute(
                'SELECT id FROM bookmarks WHERE user_id = ? AND comic_slug = ? LIMIT 1',
                [userId, comicSlug]
            );
            return c.json({ isBookmarked: Array.isArray(result) && result.length > 0 }, 200);
        }

        const result = await db.execute(
            `
            SELECT 
                b.*, 
                (SELECT rh.chapter_id 
                 FROM reading_history rh 
                 WHERE b.user_id = rh.user_id 
                   AND b.source_id = rh.source_id 
                   AND b.comic_slug = rh.comic_slug 
                 ORDER BY rh.last_read_at DESC 
                 LIMIT 1) as last_read_chapter_id
            FROM bookmarks b
            WHERE b.user_id = ? 
            ORDER BY b.created_at DESC
            `,
            [userId]
        );
        return c.json({ bookmarks: (result as any) || [] }, 200);
    } catch (err) {
        console.error('Fetch Bookmarks Error:', err);
        return c.json({ error: 'Database error' }, 500);
    }
});

bookmarks.post('/', async (c) => {
    try {
        const db = getDbConnection(c.env);
        const userId = c.get('userId');
        const body = await c.req.json();
        const { sourceId, comicSlug, comicName, thumbUrl } = body;

        if (!sourceId || !comicSlug || !comicName) {
            return c.json({ error: 'Missing required fields' }, 400);
        }

        await db.execute(
            `INSERT INTO bookmarks (user_id, source_id, comic_slug, comic_name, thumb_url) 
             VALUES (?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE thumb_url = VALUES(thumb_url)`,
            [userId, sourceId, comicSlug, comicName, thumbUrl || null]
        );

        return c.json({ success: true, message: 'Bookmarked' }, 200);
    } catch (err) {
        console.error('Save Bookmark Error:', err);
        return c.json({ error: 'Database error' }, 500);
    }
});

bookmarks.delete('/', async (c) => {
    try {
        const db = getDbConnection(c.env);
        const userId = c.get('userId');
        const body = await c.req.json();
        const { comicSlug } = body;

        if (!comicSlug) {
            return c.json({ error: 'Missing comicSlug' }, 400);
        }

        await db.execute(
            'DELETE FROM bookmarks WHERE user_id = ? AND comic_slug = ?',
            [userId, comicSlug]
        );

        return c.json({ success: true, message: 'Bookmark removed' }, 200);
    } catch (err) {
        console.error('Delete Bookmark Error:', err);
        return c.json({ error: 'Database error' }, 500);
    }
});

export default bookmarks;
