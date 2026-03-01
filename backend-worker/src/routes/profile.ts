import { Hono } from 'hono';
import jwt from 'jsonwebtoken';
import { getDbConnection } from '../utils/db';
import { Env } from '../index';

const profile = new Hono<{ Variables: { userId: number }, Bindings: Env }>();

// Simple JWT Auth middleware
profile.use('*', async (c, next) => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return c.json({ error: 'Unauthorized' }, 401);
    }
    const token = authHeader.split(' ')[1];
    const JWT_SECRET = c.env.JWT_SECRET || 'fallback_secret';

    try {
        const decodedValue = jwt.verify(token, JWT_SECRET) as any;
        c.set('userId', decodedValue.userId);
        await next();
    } catch {
        return c.json({ error: 'Invalid token' }, 401);
    }
});

profile.get('/', async (c) => {
    try {
        const db = getDbConnection(c.env);
        const userId = c.get('userId');

        const result = await db.execute(
            'SELECT id, username, email, avatar_url, cover_url, display_name, bio, avatar_frame_url FROM users WHERE id = ?',
            [userId]
        );
        const user = Array.isArray(result) && result.length > 0 ? result[0] : null;

        if (!user) {
            return c.json({ error: 'User not found' }, 404);
        }

        return c.json({ user }, 200);
    } catch (error) {
        console.error('Profile API error:', error);
        return c.json({ error: 'Internal server error' }, 500);
    }
});

profile.put('/', async (c) => {
    try {
        const db = getDbConnection(c.env);
        const userId = c.get('userId');
        const body = await c.req.json();
        const { avatar_url, cover_url, display_name, bio, avatar_frame_url } = body;

        await db.execute(
            'UPDATE users SET avatar_url = ?, cover_url = ?, display_name = ?, bio = ?, avatar_frame_url = ? WHERE id = ?',
            [avatar_url, cover_url, display_name, bio, avatar_frame_url, userId]
        );

        const result = await db.execute(
            'SELECT id, username, email, avatar_url, cover_url, display_name, bio, avatar_frame_url FROM users WHERE id = ?',
            [userId]
        );
        const user = Array.isArray(result) && result.length > 0 ? result[0] : null;

        return c.json({ message: 'Profile updated successfully', user }, 200);
    } catch (error) {
        console.error('Profile API error:', error);
        return c.json({ error: 'Internal server error' }, 500);
    }
});

export default profile;
