import { Hono } from 'hono';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDbConnection } from '../utils/db';
import { Env } from '../index';

const auth = new Hono<{ Variables: { userId: number }, Bindings: Env }>();

auth.post('/', async (c) => {
    try {
        const body = await c.req.json();
        const { action, username, email, password } = body;
        const db = getDbConnection(c.env);
        const JWT_SECRET = c.env.JWT_SECRET || 'fallback_secret';

        // --- REGISTER ---
        if (action === 'register') {
            if (!username || !email || !password) {
                return c.json({ error: 'Missing fields' }, 400);
            }

            // Check if user exists
            const existing = await db.execute('SELECT id FROM users WHERE username = ? OR email = ?', [username, email]);
            if (Array.isArray(existing) && existing.length > 0) {
                return c.json({ error: 'Username or email already exists' }, 400);
            }

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            const result = await db.execute(
                'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
                [username, email, hashedPassword]
            );

            const userId = (result as any).lastInsertId;
            const token = jwt.sign({ userId, username }, JWT_SECRET, { expiresIn: '7d' });

            return c.json({
                message: 'User created', token, user: {
                    id: userId, username, email,
                    avatar_url: null, cover_url: null, display_name: null, bio: null,
                    avatar_frame_url: null
                }
            }, 200);
        }

        // --- LOGIN ---
        if (action === 'login') {
            if (!username || !password) {
                return c.json({ error: 'Missing fields' }, 400);
            }

            const existing = await db.execute('SELECT * FROM users WHERE username = ? OR email = ?', [username, username]);
            const rows = (existing as any) || [];
            if (rows.length === 0) {
                return c.json({ error: `Debug-1: Account (${username}) not found on DB`, rows: existing }, 401);
            }
            
            const user = rows[0];

            const isMatch = await bcrypt.compare(password, user.password_hash);
            if (!isMatch) {
                return c.json({ error: 'Debug-2: Password hash verification failed', db_hash: user.password_hash }, 401);
            }

            const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });

            return c.json({
                message: 'Login successful', token, user: {
                    id: user.id, username: user.username, email: user.email,
                    avatar_url: user.avatar_url, cover_url: user.cover_url,
                    display_name: user.display_name, bio: user.bio,
                    avatar_frame_url: user.avatar_frame_url
                }
            }, 200);
        }

        return c.json({ error: 'Invalid action' }, 400);
    } catch (error) {
        console.error('Auth error:', error);
        return c.json({ error: 'Internal server error' }, 500);
    }
});

export default auth;
