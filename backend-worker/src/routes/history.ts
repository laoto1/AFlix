import { Hono } from 'hono';
import jwt from 'jsonwebtoken';
import { getDbConnection } from '../utils/db';
import { Env } from '../index';

const history = new Hono<{ Variables: { userId: number }, Bindings: Env }>();

// Auth middleware (returns 401 if missing unless explicitly handled)
history.use('*', async (c, next) => {
    if (c.req.method === 'OPTIONS') return await next();

    const authHeader = c.req.header('Authorization');
    if (!authHeader) {
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

history.get('/', async (c) => {
    try {
        const db = getDbConnection(c.env);
        const userId = c.get('userId');
        const comicSlug = c.req.query('comicSlug');

        if (comicSlug) {
            const result = await db.execute(
                'SELECT chapter_id, page_number, total_pages, is_bookmarked, last_read_at FROM reading_history WHERE user_id = ? AND comic_slug = ? ORDER BY last_read_at DESC',
                [userId, comicSlug]
            );
            return c.json({ history: (result as any) || [] }, 200);
        } else {
            const result = await db.execute(
                `WITH RankedHistory AS (
                     SELECT source_id, comic_slug, comic_name, chapter_id, page_number, total_pages, is_bookmarked, thumb_url, last_read_at,
                            ROW_NUMBER() OVER(PARTITION BY comic_slug ORDER BY last_read_at DESC, id DESC) as rn
                     FROM reading_history
                     WHERE user_id = ?
                 )
                 SELECT source_id, comic_slug, comic_name, chapter_id, page_number, total_pages, is_bookmarked, thumb_url, last_read_at
                 FROM RankedHistory
                 WHERE rn = 1
                 ORDER BY last_read_at DESC`,
                [userId]
            );
            return c.json({ history: (result as any) || [] }, 200);
        }
    } catch (err) {
        console.error(err);
        return c.json({ error: 'DB Error' }, 500);
    }
});

history.post('/', async (c) => {
    try {
        const db = getDbConnection(c.env);
        const userId = c.get('userId');
        const body = await c.req.json();

        // Single Action Update
        const { sourceId, comicSlug, comicName, chapterId, pageNumber = 0, totalPages = 0, thumbUrl } = body;
        if (!sourceId || !comicSlug || !chapterId) {
            return c.json({ error: 'Missing fields' }, 400);
        }

        await db.execute(
            `INSERT INTO reading_history (user_id, source_id, comic_slug, comic_name, chapter_id, page_number, total_pages, thumb_url, last_read_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
             ON DUPLICATE KEY UPDATE 
             page_number = VALUES(page_number),
             total_pages = VALUES(total_pages),
             comic_name = VALUES(comic_name),
             thumb_url = VALUES(thumb_url),
             last_read_at = NOW()`,
            [userId, sourceId, comicSlug, comicName || 'Unknown', chapterId, pageNumber, totalPages, thumbUrl || null]
        );

        return c.json({ success: true }, 200);
    } catch (err) {
        console.error(err);
        return c.json({ error: 'DB Error' }, 500);
    }
});

history.post('/bulk', async (c) => {
    try {
        const db = getDbConnection(c.env);
        const userId = c.get('userId');
        const body = await c.req.json();

        const { action, chapters, sourceId, comicSlug, comicName, thumbUrl } = body;
        if (!action || !chapters || !Array.isArray(chapters) || chapters.length === 0 || !sourceId || !comicSlug) {
            return c.json({ error: 'Missing bulk fields' }, 400);
        }

        for (const chapterId of chapters) {
            let pageNumber = 0;
            let totalPages = 0;
            let isBookmarked = 0;

            if (action === 'mark_read') {
                pageNumber = 1;
                totalPages = 1;
            }

            let updateClause = '';
            if (action === 'mark_read') {
                updateClause = 'page_number = VALUES(page_number), total_pages = VALUES(total_pages), last_read_at = NOW()';
            } else if (action === 'mark_unread') {
                updateClause = 'page_number = 0, total_pages = 0';
            } else if (action === 'bookmark') {
                updateClause = 'is_bookmarked = 1';
            } else if (action === 'unbookmark') {
                updateClause = 'is_bookmarked = 0';
            }

            // Execute individually per loop because TiDB Serverless doesn't safely support 
            // bulk multi-row inserts with dynamically spread placeholders over REST API easily.
            await db.execute(
                `INSERT INTO reading_history (user_id, source_id, comic_slug, comic_name, chapter_id, page_number, total_pages, is_bookmarked, thumb_url, last_read_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
                 ON DUPLICATE KEY UPDATE ${updateClause}`,
                [userId, sourceId, comicSlug, comicName || 'Unknown', chapterId, pageNumber, totalPages, isBookmarked, thumbUrl || null]
            );
        }
        
        return c.json({ success: true, message: `Bulk ${action} applied to ${chapters.length} chapters` }, 200);
    } catch (err) {
        console.error(err);
        return c.json({ error: 'DB Error' }, 500);
    }
});

export default history;
