import { Hono } from 'hono';
import { Env } from '../index';
import { getDbConnection } from '../utils/db';
import * as jwt from 'jsonwebtoken';

const communityRouter = new Hono<{ Bindings: Env }>();

// Generate UUID
function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Helper to extract user info from JWT
async function getUserFromAuth(c: any) {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    try {
        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, c.env.JWT_SECRET) as any;
        return {
            id: decoded.userId || decoded.id,
            username: decoded.username
        };
    } catch {
        return null;
    }
}

// 1. Get novels list (Public)
communityRouter.get('/novels', async (c) => {
    try {
        const tab = c.req.query('tab') || 'latest';
        const page = parseInt(c.req.query('page') || '1') || 1;
        const limit = tab === 'top50' ? 50 : 20;
        const offset = (page - 1) * limit;

        const db = getDbConnection(c.env);
        let query = '';
        let countQuery = '';
        
        if (tab === 'top50') {
            query = `SELECT * FROM community_novels ORDER BY (view_count + like_count * 10) DESC LIMIT 50`;
            countQuery = `SELECT 50 as total`; // Top 50 has max 50 items
        } else if (tab === 'completed') {
            query = `SELECT * FROM community_novels WHERE status = 'completed' ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
            countQuery = `SELECT COUNT(*) as total FROM community_novels WHERE status = 'completed'`;
        } else {
            // latest
            query = `SELECT * FROM community_novels ORDER BY updated_at DESC LIMIT ${limit} OFFSET ${offset}`;
            countQuery = `SELECT COUNT(*) as total FROM community_novels`;
        }

        const [items, countResult] = await Promise.all([
            db.execute(query),
            db.execute(countQuery)
        ]);

        const totalItems = (countResult as any)[0]?.total || 0;

        return c.json({
            status: 'success',
            data: {
                items: (items as any).map((item: any) => ({
                    id: item.id,
                    name: item.title,
                    author: item.author,
                    thumb_url: item.cover_url,
                    chapters_count: '?', // We can fetch this later or store it
                    view_count: item.view_count,
                    like_count: item.like_count,
                    categories: item.categories ? JSON.parse(item.categories) : [],
                    status: item.status,
                    updated_at: item.updated_at
                })),
                pagination: {
                    currentPage: page,
                    totalItems: parseInt(totalItems)
                }
            }
        });
    } catch (e: any) {
        return c.json({ status: 'error', message: e.message }, 500 as any);
    }
});

// 2. Create Novel (Auth Required)
communityRouter.post('/novels', async (c) => {
    try {
        const user = await getUserFromAuth(c);
        if (!user) return c.json({ status: 'error', message: 'Unauthorized' }, 401 as any);

        const body = await c.req.json();
        const db = getDbConnection(c.env);
        const novelId = uuidv4();

        await db.execute(`
            INSERT INTO community_novels (id, user_id, title, author, description, cover_url, categories, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            novelId, 
            user.id, 
            body.title, 
            user.username || 'Anonymous', // Use user's name as author or custom? Let's use custom author
            body.description, 
            body.cover_url, 
            JSON.stringify(body.categories || []), 
            body.status || 'ongoing'
        ]);

        return c.json({ status: 'success', novel_id: novelId });
    } catch (e: any) {
        return c.json({ status: 'error', message: e.message }, 500 as any);
    }
});

// 3. Get Novel Details + Chapters
communityRouter.get('/novels/:id', async (c) => {
    try {
        const db = getDbConnection(c.env);
        const novelId = c.req.param('id');
        
        const novelRes = await db.execute(`SELECT * FROM community_novels WHERE id = ?`, [novelId]);
        if (!(novelRes as any).length) return c.json({ status: 'error', message: 'Novel not found' }, 404 as any);
        const novel = (novelRes as any)[0];

        const chaptersRes = await db.execute(`SELECT id, title, order_index, created_at FROM community_chapters WHERE novel_id = ? ORDER BY order_index ASC`, [novelId]);

        // Check if current user liked it
        let isLiked = false;
        const user = await getUserFromAuth(c);
        if (user) {
            const likeRes = await db.execute(`SELECT 1 FROM community_novel_likes WHERE novel_id = ? AND user_id = ?`, [novelId, user.id]);
            isLiked = (likeRes as any).length > 0;
        }

        return c.json({
            status: 'success',
            data: {
                id: novel.id,
                name: novel.title,
                author: novel.author,
                description: novel.description,
                thumb_url: novel.cover_url,
                status: novel.status,
                view_count: novel.view_count,
                like_count: novel.like_count,
                categories: novel.categories ? JSON.parse(novel.categories).map((c: string) => ({ name: c, slug: c })) : [],
                chapters: (chaptersRes as any).map((ch: any) => ({
                    id: ch.id,
                    name: ch.title,
                    order_index: ch.order_index,
                    created_at: ch.created_at
                })),
                is_liked: isLiked,
                owner_id: novel.user_id // to show "Add chapter" button
            }
        });
    } catch (e: any) {
        return c.json({ status: 'error', message: e.message }, 500 as any);
    }
});

// 4. Record View (Anti-Spam)
communityRouter.post('/novels/:id/view', async (c) => {
    try {
        const novelId = c.req.param('id');
        const body = await c.req.json().catch(() => ({}));
        const viewerHash = body.viewer_hash || c.req.header('cf-connecting-ip') || 'anonymous';
        const today = new Date().toISOString().split('T')[0];

        const db = getDbConnection(c.env);
        
        // Try inserting into views table
        try {
            await db.execute(`INSERT INTO community_novel_views (novel_id, viewer_hash, view_date) VALUES (?, ?, ?)`, [novelId, viewerHash, today]);
            // If successful, increment view count
            await db.execute(`UPDATE community_novels SET view_count = view_count + 1 WHERE id = ?`, [novelId]);
        } catch (err: any) {
            // Duplicate entry (already viewed today) -> ignore
        }

        return c.json({ status: 'success' });
    } catch (e: any) {
        return c.json({ status: 'error', message: e.message }, 500 as any);
    }
});

// 5. Toggle Like
communityRouter.post('/novels/:id/like', async (c) => {
    try {
        const user = await getUserFromAuth(c);
        if (!user) return c.json({ status: 'error', message: 'Unauthorized' }, 401 as any);

        const novelId = c.req.param('id');
        const db = getDbConnection(c.env);

        const existingLike = await db.execute(`SELECT 1 FROM community_novel_likes WHERE novel_id = ? AND user_id = ?`, [novelId, user.id]);
        
        let liked = false;
        if ((existingLike as any).length > 0) {
            // Unlike
            await db.execute(`DELETE FROM community_novel_likes WHERE novel_id = ? AND user_id = ?`, [novelId, user.id]);
            await db.execute(`UPDATE community_novels SET like_count = like_count - 1 WHERE id = ?`, [novelId]);
        } else {
            // Like
            await db.execute(`INSERT INTO community_novel_likes (novel_id, user_id) VALUES (?, ?)`, [novelId, user.id]);
            await db.execute(`UPDATE community_novels SET like_count = like_count + 1 WHERE id = ?`, [novelId]);
            liked = true;
        }

        return c.json({ status: 'success', liked });
    } catch (e: any) {
        return c.json({ status: 'error', message: e.message }, 500 as any);
    }
});

// 6. Add Chapter
communityRouter.post('/novels/:id/chapters', async (c) => {
    try {
        const user = await getUserFromAuth(c);
        if (!user) return c.json({ status: 'error', message: 'Unauthorized' }, 401 as any);

        const novelId = c.req.param('id');
        const db = getDbConnection(c.env);
        
        const novelRes = await db.execute(`SELECT user_id FROM community_novels WHERE id = ?`, [novelId]);
        if (!(novelRes as any).length || (novelRes as any)[0].user_id !== user.id) {
            return c.json({ status: 'error', message: 'Forbidden. You are not the owner.' }, 403 as any);
        }

        const body = await c.req.json();
        const chapterId = uuidv4();
        
        // Get next order_index
        const lastChapRes = await db.execute(`SELECT MAX(order_index) as max_index FROM community_chapters WHERE novel_id = ?`, [novelId]);
        const nextIndex = ((lastChapRes as any)[0]?.max_index || 0) + 1;

        await db.execute(`
            INSERT INTO community_chapters (id, novel_id, title, content_text, order_index)
            VALUES (?, ?, ?, ?, ?)
        `, [chapterId, novelId, body.title, body.content_text, nextIndex]);

        // Update novel's updated_at
        await db.execute(`UPDATE community_novels SET updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [novelId]);

        return c.json({ status: 'success', chapter_id: chapterId });
    } catch (e: any) {
        return c.json({ status: 'error', message: e.message }, 500 as any);
    }
});

// 7. Get Chapter Content
communityRouter.get('/novels/:id/chapters/:chapterId', async (c) => {
    try {
        const db = getDbConnection(c.env);
        const novelId = c.req.param('id');
        const chapterId = c.req.param('chapterId');

        const chapRes = await db.execute(`SELECT * FROM community_chapters WHERE id = ? AND novel_id = ?`, [chapterId, novelId]);
        if (!(chapRes as any).length) return c.json({ status: 'error', message: 'Chapter not found' }, 404 as any);
        const chapter = (chapRes as any)[0];

        const novelRes = await db.execute(`SELECT title FROM community_novels WHERE id = ?`, [novelId]);
        const novel = (novelRes as any)[0];

        // Format to HTML paragraphs
        const formattedContent = chapter.content_text.split('\\n').map((p: string) => `<p>${p.trim()}</p>`).join('');

        return c.json({
            status: 'success',
            data: {
                id: chapter.id,
                name: chapter.title,
                bookName: novel?.title || 'Unknown',
                content: formattedContent,
                order_index: chapter.order_index
            }
        });
    } catch (e: any) {
        return c.json({ status: 'error', message: e.message }, 500 as any);
    }
});

export default communityRouter;
