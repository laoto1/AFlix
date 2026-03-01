import { Hono } from 'hono';
import jwt from 'jsonwebtoken';
import { Env } from '../index';

const upload = new Hono<{ Bindings: Env }>();

upload.post('/', async (c) => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return c.json({ error: 'Unauthorized' }, 401);
    }

    const token = authHeader.split(' ')[1];
    const JWT_SECRET = c.env.JWT_SECRET || 'fallback_secret';

    try {
        jwt.verify(token, JWT_SECRET);
    } catch {
        return c.json({ error: 'Invalid token' }, 401);
    }

    const IMGBB_API_KEY = c.env.IMGBB_API_KEY;
    if (!IMGBB_API_KEY) {
        return c.json({ error: 'Server misconfiguration: ImgBB Key missing' }, 500);
    }

    try {
        const body = await c.req.json();
        const { image } = body;

        if (!image) {
            return c.json({ error: 'Missing image data' }, 400);
        }

        const formData = new URLSearchParams();
        formData.append('image', image);

        // Native fetch handles Worker REST natively
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
            method: 'POST',
            body: formData.toString(),
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        const data: any = await response.json();

        if (data.success) {
            return c.json({
                url: data.data.url,
                display_url: data.data.display_url,
                thumbUrl: data.data.thumb?.url || data.data.url,
                delete_url: data.data.delete_url
            }, 200);
        } else {
            return c.json({ error: 'ImgBB upload failed' }, 500);
        }
    } catch (error: any) {
        console.error('Upload error:', error.message);
        return c.json({ error: 'Internal server error while uploading' }, 500);
    }
});

export default upload;
