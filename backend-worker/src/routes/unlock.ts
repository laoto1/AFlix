import { Hono } from 'hono';

const unlock = new Hono();

unlock.post('/', async (c) => {
    try {
        const body = await c.req.json();
        const { key } = body;
        const VALID_KEY = '@laoto'; // Hardcoded for now based on user instruction

        if (key === VALID_KEY) {
            return c.json({ success: true, message: 'Source unlocked' }, 200);
        } else {
            return c.json({ error: 'Invalid secret key' }, 401);
        }
    } catch {
        return c.json({ error: 'Invalid request' }, 400);
    }
});

export default unlock;
